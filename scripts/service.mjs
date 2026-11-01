// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** Permission-checked Actor operations and actor-scoped write sequencing. */
import { MODULE_ID, assertSafePath, fallbackPattern, isImagePath } from './files.mjs';
const inFlight = new Map();

export function mayEdit(actor, token, { user, allowPlayers = true, requireToken = true } = {}) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  if (!allowPlayers) return false;
  if (!actor.testUserPermission?.(user, 'OWNER')) return false;
  if (requireToken && (!token?.document || !token.document.testUserPermission?.(user, 'OWNER'))) return false;
  return true;
}

function serial(actor, work) {
  const key = actor.uuid || actor.id;
  const previous = inFlight.get(key) || Promise.resolve();
  const result = previous.catch(() => {}).then(work);
  const tail = result.catch(() => {});
  inFlight.set(key, tail);
  void tail.finally(() => { if (inFlight.get(key) === tail) inFlight.delete(key); });
  return result;
}

export function currentPattern(actor) {
  const stored = actor?.getFlag?.(MODULE_ID, 'pattern');
  return typeof stored === 'string' && stored.trim() ? stored.trim() : fallbackPattern(actor.img);
}

export function createPortraitService({ user, allowed, hooks, listFiles } = {}) {
  function authorize(actor, token, requireToken) {
    if (!mayEdit(actor, token, { user: user(), allowPlayers: allowed(), requireToken })) {
      throw new Error('You do not have permission to edit this portrait');
    }
  }
  return {
    async images(actor, { refresh = false, token = null } = {}) {
      authorize(actor, token, Boolean(token));
      return listFiles(currentPattern(actor), { refresh });
    },
    async change(actor, image, { token = null } = {}) {
      return serial(actor, async () => {
        // A player must supply an owned live token; GM automation may omit one.
        authorize(actor, token, true);
        const path = assertSafePath(image);
        if (!isImagePath(path) || /[*?{}]/.test(path)) throw new Error('Choose a concrete image file');
        // Revalidate against the resolved candidate set, not client-provided arbitrary paths.
        const candidates = await listFiles(currentPattern(actor));
        if (!candidates.includes(path)) throw new Error('The image is not in this Actor\'s portrait selection');
        if (actor.img === path) return false;
        const previous = actor.img;
        await actor.update({ img: path });
        hooks?.('runythCyclePortraitChanged', { actor, token, previous, image: path });
        return true;
      });
    },
    async setPattern(actor, pattern, { token = null } = {}) {
      return serial(actor, async () => {
        authorize(actor, token, Boolean(token));
        const next = assertSafePath(pattern, { allowEmpty: true });
        if (!next) await actor.unsetFlag(MODULE_ID, 'pattern');
        else await actor.setFlag(MODULE_ID, 'pattern', next);
        return next;
      });
    }
  };
}
