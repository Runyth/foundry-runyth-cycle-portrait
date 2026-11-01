// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortraitService, mayEdit, currentPattern } from '../scripts/service.mjs';
import { MODULE_ID } from '../scripts/files.mjs';

function fixture({ isGM = false, ownsActor = true, ownsToken = true, allowPlayers = true, files = ['portraits/a.png', 'portraits/b.png'] } = {}) {
  const user = { id: 'player', isGM };
  const token = { document: { testUserPermission: () => ownsToken } };
  const flags = {};
  let writes = 0;
  const actor = {
    uuid: 'Actor.1', id: '1', img: 'portraits/a.png', name: 'Actor',
    testUserPermission: () => ownsActor,
    getFlag: (_scope, key) => flags[key],
    setFlag: async (_scope, key, value) => { flags[key] = value; },
    unsetFlag: async (_scope, key) => { delete flags[key]; },
    update: async change => { writes++; await Promise.resolve(); Object.assign(actor, change); }
  };
  const events = [];
  const service = createPortraitService({
    user: () => user, allowed: () => allowPlayers,
    hooks: (name, data) => events.push([name, data]),
    listFiles: async () => files
  });
  return { actor, token, user, service, flags, events, get writes() { return writes; } };
}

test('install defaults to existing Actor portrait without any mutation', async () => {
  const f = fixture();
  assert.equal(currentPattern(f.actor), 'portraits/*');
  assert.deepEqual(await f.service.images(f.actor, { token: f.token }), ['portraits/a.png', 'portraits/b.png']);
  assert.equal(f.writes, 0);
  assert.deepEqual(f.flags, {});
});

test('choosing updates only Actor image and emits change notification', async () => {
  const f = fixture();
  assert.equal(await f.service.change(f.actor, 'portraits/b.png', { token: f.token }), true);
  assert.equal(f.actor.img, 'portraits/b.png');
  assert.equal(f.writes, 1);
  assert.equal(f.events[0][0], 'runythCyclePortraitChanged');
  assert.equal(f.events[0][1].previous, 'portraits/a.png');
  assert.equal(await f.service.change(f.actor, 'portraits/b.png', { token: f.token }), false);
  assert.equal(f.writes, 1);
});

test('permission checks are enforced on read, change and pattern write', async () => {
  for (const changes of [{ ownsActor: false }, { ownsToken: false }, { allowPlayers: false }]) {
    const f = fixture(changes);
    await assert.rejects(() => f.service.images(f.actor, { token: f.token }));
    await assert.rejects(() => f.service.change(f.actor, 'portraits/b.png', { token: f.token }));
    await assert.rejects(() => f.service.setPattern(f.actor, 'portraits/*.png', { token: f.token }));
    assert.equal(f.writes, 0);
  }
  const gm = fixture({ isGM: true, ownsActor: false, ownsToken: false, allowPlayers: false });
  assert.equal(mayEdit(gm.actor, gm.token, { user: gm.user, allowPlayers: false }), true);
  await gm.service.change(gm.actor, 'portraits/b.png', { token: gm.token });
  assert.equal(gm.writes, 1);
});

test('player API cannot bypass live-token ownership with a missing token', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.change(f.actor, 'portraits/b.png'));
  assert.equal(f.writes, 0);
});

test('only selected source image may be applied', async () => {
  const f = fixture();
  for (const invalid of ['portraits/c.png', '../private.png', 'data:image/png;base64,AAA', 'portraits/*.png', 'portraits/a.js']) {
    await assert.rejects(() => f.service.change(f.actor, invalid, { token: f.token }));
  }
  assert.equal(f.writes, 0);
});

test('patterns are actor scoped and clear restores folder discovery', async () => {
  const f = fixture();
  await f.service.setPattern(f.actor, 'portraits/Body_*.webp', { token: f.token });
  assert.equal(f.actor.getFlag(MODULE_ID, 'pattern'), 'portraits/Body_*.webp');
  assert.equal(currentPattern(f.actor), 'portraits/Body_*.webp');
  await f.service.setPattern(f.actor, '', { token: f.token });
  assert.equal(currentPattern(f.actor), 'portraits/*');
  assert.deepEqual(f.flags, {});
});

test('concurrent Actor updates are serialized', async () => {
  const f = fixture();
  await Promise.all([
    f.service.change(f.actor, 'portraits/b.png', { token: f.token }),
    f.service.change(f.actor, 'portraits/a.png', { token: f.token })
  ]);
  assert.equal(f.actor.img, 'portraits/a.png');
  assert.equal(f.writes, 2);
});
