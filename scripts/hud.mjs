/** Idempotent Foundry v13 Token HUD integration. */
import { MODULE_ID } from './files.mjs';
import { SETTING, pref, t } from './settings.mjs';
import { mayEdit } from './service.mjs';
import { setHudIcon } from './hud-icons.mjs';
import { stopHudOrdering, trackHudOrdering } from './hud-order.mjs';

export function resolveBaseActor(token, actors) {
  const id = token?.document?.actorId;
  return (id && actors?.get?.(id)) || token?.actor || null;
}

export function installHud(service, open) {
  Hooks.on('renderTokenHUD', (hud, html) => {
    const root = html instanceof HTMLElement ? html : hud.element;
    if (!root) return;
    const token = hud.object;
    const actor = resolveBaseActor(token, game.actors);
    if (!pref(SETTING.hud) || !mayEdit(actor, token, { user: game.user, allowPlayers: pref(SETTING.owners) })) {
      stopHudOrdering();
      return;
    }
    const column = root.querySelector('.col.right') || root.querySelector('.col.left');
    if (!column) return;
    let control = root.querySelector('[data-runyth-cycle-portrait]');
    if (!control) {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'control-icon rcp-hud-button';
      control.dataset.runythCyclePortrait = '';
      control.dataset.module = MODULE_ID;
      control.addEventListener('pointerdown', event => event.stopPropagation());
      control.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        // Read from the currently rendered HUD, not a closure over an older token.
        const currentToken = hud.object;
        const currentActor = resolveBaseActor(currentToken, game.actors);
        if (!mayEdit(currentActor, currentToken, { user: game.user, allowPlayers: pref(SETTING.owners) })) return;
        open(currentActor, currentToken, service);
      });
      column.append(control);
    }
    control.title = t('open');
    control.setAttribute('aria-label', t('open'));
    setHudIcon(control, pref(SETTING.icon));
    trackHudOrdering(root, control);
  });
  Hooks.on('canvasTearDown', stopHudOrdering);
}
