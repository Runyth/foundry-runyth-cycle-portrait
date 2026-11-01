import test from 'node:test';
import assert from 'node:assert/strict';

// HUD behavior helpers can be loaded without a game canvas.
const { resolveBaseActor } = await import('../scripts/hud.mjs');

test('resolves world Actor rather than a synthetic unlinked-token Actor', () => {
  const base = { uuid: 'Actor.base', img: 'head.webp' };
  const synthetic = { uuid: 'Scene.1.Token.1.Actor', img: 'other.webp' };
  const token = { document: { actorId: 'base' }, actor: synthetic };
  assert.equal(resolveBaseActor(token, new Map([['base', base]])), base);
});

test('uses the attached Actor when no world Actor is available', () => {
  const actor = { uuid: 'Actor.test' };
  assert.equal(resolveBaseActor({ actor, document: {} }, new Map()), actor);
  assert.equal(resolveBaseActor(null, new Map()), null);
});
