// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** Optional Actor portrait source control within the prototype appearance content. */
import { MODULE_ID } from './files.mjs';
import { SETTING, pref, t } from './settings.mjs';
import { mayEdit } from './service.mjs';

export function installPrototypeControls(service) {
  Hooks.on('renderPrototypeTokenConfig', (app, html) => {
    const actor = app.actor;
    if (!actor || !mayEdit(actor, null, { user: game.user, allowPlayers: pref(SETTING.owners), requireToken: false })) return;
    const root = html instanceof HTMLElement ? html : app.element;
    if (!root) return;
    const appearance = [...root.querySelectorAll('[data-tab="appearance"]')]
      .find(node => !node.matches('a,button,nav [data-tab]') &&
        (node.matches('.tab, .tab-content, section, article, div') && node.querySelector('input,select')));
    if (!appearance || appearance.querySelector('.rcp-prototype-source')) return;
    const section = document.createElement('section');
    section.className = 'form-group rcp-prototype-source';
    const label = document.createElement('label');
    label.textContent = t('patternLabel');
    const row = document.createElement('div');
    row.className = 'rcp-pattern-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = actor.getFlag(MODULE_ID, 'pattern') || '';
    input.placeholder = t('defaultPattern');
    input.setAttribute('aria-label', t('patternLabel'));
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = t('save');
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = t('clear');
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = t('patternHint');
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    async function apply(value) {
      save.disabled = clear.disabled = true;
      try {
        await service.setPattern(actor, value);
        input.value = value;
        message.textContent = t('saved');
      } catch (error) { message.textContent = error.message; }
      finally { save.disabled = clear.disabled = false; }
    }
    save.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); void apply(input.value); });
    clear.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); void apply(''); });
    // These fields do not participate in the token form submission.
    input.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
    row.append(input, save, clear);
    section.append(label, row, hint, message);
    appearance.append(section);
  });
}
