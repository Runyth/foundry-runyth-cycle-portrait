// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { t } from './settings.mjs';
import { readGeometry, resetGeometry, saveGeometry, visibleGeometry } from './gallery.mjs';

export class HelpWindow extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'rcp-help',
    classes: ['runyth-cycle-portrait-app', 'rcp-help-window'],
    window: { title: 'Runyth Cycle Portrait — Help', resizable: true },
    position: { width: 560, height: 560 }
  };
  constructor(options = {}) {
    super(options);
    this.geometry = readGeometry('help');
  }
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.geometry) return;
    const position = visibleGeometry(this.geometry, window.innerWidth, window.innerHeight);
    this.geometry = null;
    if (position) this.setPosition(position);
  }
  _onPosition(position) {
    super._onPosition(position);
    if (this.rendered) saveGeometry('help', position);
  }
  async _renderHTML() {
    const body = document.createElement('div');
    body.className = 'rcp-help';
    for (const key of ['intro', 'setup', 'pattern', 'defaults', 'permission', 'shortcuts']) {
      const heading = document.createElement('h3');
      heading.textContent = t(`help.${key}.heading`);
      const p = document.createElement('p');
      p.textContent = t(`help.${key}.body`);
      body.append(heading, p);
    }
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = t('resetGeometry');
    reset.addEventListener('click', () => {
      resetGeometry('picker');
      resetGeometry('help');
      ui.notifications.info(t('resetDone'));
    });
    body.append(reset);
    return body;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
}
