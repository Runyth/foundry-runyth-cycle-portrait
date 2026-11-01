/** Maintain the Portrait button immediately visually beneath the Cycle Token button.
 *
 * This integration is optional. It observes only the current HUD and moves only
 * our own control, without changing other modules' controls or Foundry classes.
 */
const TOKEN_MODULE = 'runyth-cycle-token';
const TOKEN_SELECTOR = '.runyth-cycle-token-hud, [data-runyth-cycle-token], [data-module="runyth-cycle-token"][class~="control-icon"]';
let watchedRoot = null;
let watchedButton = null;
let observer = null;

export function findCycleTokenButton(hud) {
  if (!hud?.querySelectorAll) return null;
  const results = [...hud.querySelectorAll(TOKEN_SELECTOR)].filter(node =>
    node.matches('button, .control-icon, [role="button"]') &&
    !node.matches('[data-runyth-cycle-portrait]'));
  return results.length === 1 ? results[0] : null;
}

export function placePortraitBelowToken(hud, portrait) {
  if (!hud?.contains?.(portrait)) return false;
  const token = findCycleTokenButton(hud);
  if (!token || token === portrait || !token.parentElement) return false;
  const column = token.parentElement;
  const direction = typeof getComputedStyle === 'function' ? getComputedStyle(column).flexDirection : '';
  const reversed = direction === 'column-reverse' || direction === 'row-reverse';
  // With flex-direction: column-reverse, the visual direction reverses DOM order.
  if (reversed) {
    if (portrait.nextElementSibling === token && portrait.parentElement === column) return false;
    column.insertBefore(portrait, token);
  } else {
    if (token.nextElementSibling === portrait && portrait.parentElement === column) return false;
    column.insertBefore(portrait, token.nextElementSibling);
  }
  return true;
}

export function stopHudOrdering() {
  observer?.disconnect();
  observer = null;
  watchedRoot = null;
  watchedButton = null;
}

export function trackHudOrdering(hud, portrait) {
  if (!hud?.contains?.(portrait)) return;
  if (watchedRoot !== hud || watchedButton !== portrait) {
    stopHudOrdering();
    watchedRoot = hud;
    watchedButton = portrait;
  }
  placePortraitBelowToken(hud, portrait);
  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      if (watchedRoot === hud && hud.contains(portrait)) placePortraitBelowToken(hud, portrait);
    });
    // Hooks from other modules may append their buttons after our render hook.
    observer.observe(hud, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'data-module', 'data-runyth-cycle-token', 'style']
    });
  }
}
