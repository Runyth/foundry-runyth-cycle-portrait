import test from 'node:test';
import assert from 'node:assert/strict';

test('entrypoint initializes without mutating Actor documents or requiring other modules', async () => {
  const oneTimeHooks = new Map();
  const regularHooks = new Map();
  globalThis.Hooks = {
    once: (name, callback) => oneTimeHooks.set(name, callback),
    on: (name, callback) => regularHooks.set(name, callback),
    callAll: () => {}
  };
  globalThis.foundry = {
    applications: {
      api: { ApplicationV2: class {} },
      apps: { FilePicker: { browse: async () => ({ files: [] }) } }
    }
  };
  const module = { id: 'runyth-cycle-portrait' };
  const registered = new Map();
  let writes = 0;
  globalThis.game = {
    user: { isGM: true },
    actors: new Map(),
    modules: new Map([[module.id, module]]),
    i18n: { localize: key => key },
    settings: {
      register: (_module, key, value) => registered.set(key, value),
      registerMenu: () => {},
      get: (_module, key) => registered.get(key)?.default,
      set: async () => { writes++; }
    }
  };
  globalThis.canvas = { tokens: { hud: { render: () => {} } } };
  await import('../scripts/main.mjs');
  assert.equal(typeof oneTimeHooks.get('init'), 'function');
  await oneTimeHooks.get('init')();
  assert.equal(registered.get('advanced').scope, 'client');
  assert.equal(registered.get('advanced').default, false);
  assert.equal(registered.get('opacity').default, 100);
  assert.equal(registered.get('hud').default, true);
  await oneTimeHooks.get('ready')();
  assert.equal(typeof module.api.open, 'function');
  assert.equal(typeof module.api.choose, 'function');
  assert.equal(typeof regularHooks.get('renderTokenHUD'), 'function');
  assert.equal(typeof regularHooks.get('renderPrototypeTokenConfig'), 'function');
  assert.equal(writes, 0);
});
