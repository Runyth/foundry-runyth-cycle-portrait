// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** An accessible ApplicationV2 gallery; all dynamic markup uses safe DOM APIs. */
import { MODULE_ID, filename, regexFilter } from './files.mjs';
import { SETTING, pref, t } from './settings.mjs';
import { thumbnailDimensions, readThumbnailPreferences, applyWindowOpacity } from './thumbnail-size.mjs';

const PAGE = 64;
const OPEN = new Map();
const GEOMETRY_PREFIX = `${MODULE_ID}.geometry.`;

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function button(text, action, label = text) {
  const node = element('button', 'rcp-action', text);
  node.type = 'button';
  node.dataset.action = action;
  node.setAttribute('aria-label', label);
  node.title = label;
  return node;
}
function settingNumber(key) { return Number(pref(key)); }
export function readGeometry(id) {
  try {
    const result = JSON.parse(localStorage.getItem(`${GEOMETRY_PREFIX}${id}`) || 'null');
    if (!result || typeof result !== 'object') return null;
    const valid = ['left', 'top', 'width', 'height'].every(key => Number.isFinite(result[key])) &&
      result.width > 0 && result.height > 0;
    return valid ? result : null;
  } catch { return null; }
}

/**
 * Keep saved floating windows entirely within the current viewport whenever
 * possible. Old 0.1.1 positions could be recorded while its CSS mistakenly
 * placed the window in the sidebar layout; treat them as viewport coordinates,
 * never as offsets from the sidebar or another interface element.
 * Foundry remains the only owner of the window's positioning and drag logic.
 */
export function visibleGeometry(saved, viewportWidth, viewportHeight) {
  if (!saved || !Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) ||
      viewportWidth <= 0 || viewportHeight <= 0) return null;
  const margin = 12;
  const maxWidth = Math.max(1, viewportWidth - margin * 2);
  const maxHeight = Math.max(1, viewportHeight - margin * 2);
  const width = Math.min(Math.max(1, saved.width), maxWidth);
  const height = Math.min(Math.max(1, saved.height), maxHeight);
  return {
    left: Math.max(margin, Math.min(saved.left, viewportWidth - width - margin)),
    top: Math.max(margin, Math.min(saved.top, viewportHeight - height - margin)),
    width,
    height
  };
}
export function saveGeometry(id, position) {
  try {
    const payload = Object.fromEntries(['left', 'top', 'width', 'height']
      .map(key => [key, Number(position[key])]).filter(([, value]) => Number.isFinite(value)));
    if (Object.keys(payload).length === 4) localStorage.setItem(`${GEOMETRY_PREFIX}${id}`, JSON.stringify(payload));
  } catch { /* Local storage is optional in privacy-restricted browsers. */ }
}
export function resetGeometry(id) {
  try { localStorage.removeItem(`${GEOMETRY_PREFIX}${id}`); } catch { /* ignore */ }
}

export function openGallery(actor, token, service) {
  if (!actor) return;
  const existing = OPEN.get(actor.uuid);
  if (existing?.rendered) {
    existing.token = token;
    existing.bringToFront();
    return existing;
  }
  const app = new PortraitGallery(actor, token, service);
  OPEN.set(actor.uuid, app);
  void app.render(true).catch(error => {
    OPEN.delete(actor.uuid);
    ui.notifications.error(error.message);
  });
  return app;
}

export class PortraitGallery extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'runyth-cycle-portrait-gallery',
    classes: ['runyth-cycle-portrait-app'],
    window: { title: 'RCP.title', resizable: true, minimizable: true },
    position: { width: 720, height: 620 }
  };

  constructor(actor, token, service) {
    super({ id: `rcp-${actor.id}`, window: { title: `${t('title')}: ${actor.name}` } });
    this.actor = actor;
    this.token = token;
    this.service = service;
    this.all = [];
    this.filtered = [];
    this.displayed = 0;
    this.query = '';
    this.regex = pref(SETTING.regex);
    this.busy = false;
    this.generation = 0;
    this.geometry = readGeometry('picker');
  }

  async _renderHTML() {
    const shell = element('section', 'rcp-shell');
    shell.setAttribute('aria-label', t('title'));
    const controls = element('div', 'rcp-controls');
    const search = element('input', 'rcp-search');
    search.type = 'search';
    search.placeholder = t('search');
    search.setAttribute('aria-label', t('search'));
    search.value = this.query;
    controls.append(search);
    const toggle = button('✱', 'regex', t('regex'));
    toggle.classList.add('rcp-regex');
    toggle.setAttribute('aria-pressed', String(this.regex));
    controls.append(toggle);
    if (pref(SETTING.advanced)) {
      controls.append(button('◀', 'previous', t('previous')));
      controls.append(button('▶', 'next', t('next')));
      controls.append(button('↻', 'refresh', t('refresh')));
      controls.append(button('?', 'help', t('helpButton')));
    }
    shell.append(controls);
    const status = element('div', 'rcp-status', t('loading'));
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    shell.append(status);
    const gallery = element('div', 'rcp-gallery');
    gallery.setAttribute('aria-label', t('title'));
    shell.append(gallery);
    if (pref(SETTING.advanced)) {
      const details = element('details', 'rcp-configuration');
      const summary = element('summary', '', t('sourceSettings'));
      details.append(summary);
      const row = element('div', 'rcp-pattern-row');
      const source = element('input', 'rcp-pattern');
      source.type = 'text';
      source.value = this.actor.getFlag(MODULE_ID, 'pattern') || '';
      source.placeholder = t('defaultPattern');
      source.setAttribute('aria-label', t('patternLabel'));
      row.append(source, button(t('save'), 'save-pattern'), button(t('clear'), 'clear-pattern'));
      details.append(row);
      details.append(element('p', 'rcp-pattern-description', t('patternHint')));
      shell.append(details);
    }
    return shell;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  _onPosition(position) {
    super._onPosition(position);
    if (this.rendered) saveGeometry('picker', position);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element.querySelector('.rcp-shell');
    if (!root) return;
    this._size();
    if (this.geometry) {
      const position = visibleGeometry(this.geometry, window.innerWidth, window.innerHeight);
      this.geometry = null;
      if (position) this.setPosition(position);
    }
    root.querySelector('.rcp-search').addEventListener('input', event => {
      this.query = event.currentTarget.value;
      this._filter();
    });
    root.addEventListener('click', event => this._click(event));
    root.querySelector('.rcp-gallery').addEventListener('scroll', () => this._paginate());
    this._load();
  }

  _onClose(options) {
    this.generation++;
    if (OPEN.get(this.actor.uuid) === this) OPEN.delete(this.actor.uuid);
    return super._onClose(options);
  }

  _size() {
    if (!this.element) return;
    const { width, height } = thumbnailDimensions(readThumbnailPreferences());
    this.element.style.setProperty('--rcp-thumb-width', `${width}px`);
    this.element.style.setProperty('--rcp-thumb-height', `${height}px`);
    applyWindowOpacity(this.element, settingNumber(SETTING.opacity));
  }

  _setStatus(value, error = false) {
    const line = this.element?.querySelector('.rcp-status');
    if (!line) return;
    line.textContent = value;
    line.classList.toggle('rcp-error', error);
  }

  async _load(refresh = false) {
    const index = ++this.generation;
    this.busy = true;
    this._setStatus(t('loading'));
    try {
      const files = await this.service.images(this.actor, { refresh, token: this.token });
      if (index !== this.generation || !this.rendered) return;
      this.all = files;
      this.busy = false;
      this._filter();
    } catch (error) {
      if (index !== this.generation || !this.rendered) return;
      this.busy = false;
      this.all = [];
      this._filter();
      this._setStatus(`${t('loadError')}: ${error.message}`, true);
    }
  }

  _filter() {
    const gallery = this.element?.querySelector('.rcp-gallery');
    if (!gallery) return;
    let match;
    try { match = regexFilter(this.query, { regex: this.regex }); }
    catch (error) {
      gallery.replaceChildren();
      this._setStatus(error.message, true);
      return;
    }
    this.filtered = this.all.filter(path => match(filename(path)));
    this.displayed = 0;
    gallery.replaceChildren();
    gallery.scrollTop = 0;
    this._paginate();
    if (!this.busy) {
      this._setStatus(this.filtered.length
        ? `${this.filtered.length} ${t('images')}`
        : this.all.length ? t('noSearchResults') : t('empty'));
    }
  }

  _paginate() {
    const gallery = this.element?.querySelector('.rcp-gallery');
    if (!gallery) return;
    // A few pages can be appended at once if the window is unusually tall.
    for (let tries = 0; tries < 3 && this.displayed < this.filtered.length; tries++) {
      if (this.displayed && gallery.scrollTop + gallery.clientHeight < gallery.scrollHeight - 400) break;
      const fragment = document.createDocumentFragment();
      for (const image of this.filtered.slice(this.displayed, this.displayed + PAGE)) {
        const name = filename(image);
        const tile = button('', 'select', pref(SETTING.tooltips) ? name.replace(/\.[^.]+$/, '') : t('choose'));
        tile.classList.add('rcp-tile');
        
        tile.dataset.src = image;
        tile.setAttribute('aria-label', `${t('choose')}: ${name}`);
        if (!pref(SETTING.tooltips)) tile.removeAttribute('title');
        if (image === this.actor.img) tile.classList.add('is-current');
        const img = element('img', 'rcp-thumbnail');
        img.src = image;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => tile.classList.add('is-missing'), { once: true });
        tile.append(img);
        if (pref(SETTING.captions)) tile.append(element('span', 'rcp-caption', name));
        fragment.append(tile);
      }
      this.displayed += Math.min(PAGE, this.filtered.length - this.displayed);
      gallery.append(fragment);
    }
  }

  async _click(event) {
    const control = event.target.closest('button[data-action]');
    if (!control || this.busy) return;
    const action = control.dataset.action;
    if (action === 'regex') {
      this.regex = !this.regex;
      control.setAttribute('aria-pressed', String(this.regex));
      void game.settings.set(MODULE_ID, SETTING.regex, this.regex).catch(error => console.error('Could not save regex preference', error));
      this._filter();
      return;
    }
    if (action === 'refresh') return void this._load(true);
    if (action === 'help') {
      game.modules.get(MODULE_ID)?.api?.help();
      return;
    }
    if (action === 'previous' || action === 'next') {
      const index = Math.max(0, this.filtered.indexOf(this.actor.img));
      const delta = action === 'next' ? 1 : -1;
      const next = this.filtered[(index + delta + this.filtered.length) % this.filtered.length];
      if (next) await this._choose(next);
      return;
    }
    if (action === 'select') return void this._choose(control.dataset.src);
    if (action === 'save-pattern' || action === 'clear-pattern') {
      const input = this.element.querySelector('.rcp-pattern');
      const pattern = action === 'clear-pattern' ? '' : input.value;
      try {
        this.busy = true;
        await this.service.setPattern(this.actor, pattern, { token: this.token });
        input.value = pattern;
        this.all = [];
        this._setStatus(t('saved'));
      } catch (error) { this._setStatus(error.message, true); }
      finally { this.busy = false; }
      return void this._load(true);
    }
  }

  async _choose(path) {
    if (this.busy) return;
    this.busy = true;
    this._setStatus(t('saving'));
    try {
      await this.service.change(this.actor, path, { token: this.token });
      for (const tile of this.element.querySelectorAll('.rcp-tile')) {
        tile.classList.toggle('is-current', tile.dataset.src === path);
      }
      this._setStatus(t('saved'));
    } catch (error) {
      this._setStatus(`${t('updateError')}: ${error.message}`, true);
    } finally { this.busy = false; }
  }
}

export function updateOpenGalleries(actor) {
  const app = OPEN.get(actor?.uuid);
  if (!app?.rendered) return;
  for (const tile of app.element.querySelectorAll('.rcp-tile')) {
    tile.classList.toggle('is-current', tile.dataset.src === actor.img);
  }
}

export function refreshAppearance() {
  for (const gallery of OPEN.values()) if (gallery.rendered) {
    // Preserve the search and selection while reapplying all personal preferences.
    void gallery.render().catch(error => console.error('Portrait gallery refresh failed', error));
  }
}
