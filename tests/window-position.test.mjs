import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ApplicationV2 is a Foundry global. The stub only allows importing the
// production module for pure layout/geometry tests; it does not fake a real UI.
globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
const { readGeometry, saveGeometry, visibleGeometry } = await import('../scripts/gallery.mjs');

const css = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '');

test('module CSS never replaces native ApplicationV2 root positioning', () => {
  const root = stripComments(css).match(/\.runyth-cycle-portrait-app\s*\{([^}]+)\}/)?.[1];
  assert.ok(root);
  assert.doesNotMatch(root, /(?:^|;)\s*position\s*:/i);
  assert.doesNotMatch(root, /(?:^|;)\s*inset\s*:/i);
  assert.doesNotMatch(root, /(?:^|;)\s*(?:left|top|right|bottom|z-index|display|transform)\s*:/i);
  assert.match(css, /\.runyth-cycle-portrait-app::before\s*\{[\s\S]*?position:\s*absolute/);
});

test('restoring historic window geometry keeps every edge on-screen', () => {
  assert.deepEqual(visibleGeometry({ left: 900, top: 700, width: 720, height: 620 }, 1150, 800),
    { left: 418, top: 168, width: 720, height: 620 });
  assert.deepEqual(visibleGeometry({ left: -1000, top: -2000, width: 720, height: 620 }, 1150, 800),
    { left: 12, top: 12, width: 720, height: 620 });
  const narrow = visibleGeometry({ left: 1200, top: 999, width: 950, height: 900 }, 380, 300);
  assert.deepEqual(narrow, { left: 12, top: 12, width: 356, height: 276 });
  assert.equal(visibleGeometry(null, 1150, 800), null);
  assert.equal(visibleGeometry({ left: 0, top: 0, width: 800, height: 600 }, 0, 600), null);
});

test('saved positions remain usable and invalid dimensions are rejected', () => {
  const original = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  try {
    saveGeometry('picker', { left: 900, top: 700, width: 720, height: 620 });
    assert.deepEqual(visibleGeometry(readGeometry('picker'), 1150, 800),
      { left: 418, top: 168, width: 720, height: 620 });
    saveGeometry('help', { left: -300, top: 500, width: 560, height: 500 });
    assert.deepEqual(visibleGeometry(readGeometry('help'), 900, 650),
      { left: 12, top: 138, width: 560, height: 500 });
    storage.set('runyth-cycle-portrait.geometry.picker', JSON.stringify({ left: 0, top: 0, width: -4, height: 400 }));
    assert.equal(readGeometry('picker'), null);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
