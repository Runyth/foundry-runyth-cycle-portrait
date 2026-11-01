import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HUD_ICONS } from '../scripts/hud-icons.mjs';
import { registerSettings, SETTING } from '../scripts/settings.mjs';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('release metadata and full AGPL v3-or-later license are consistent', () => {
  const module = JSON.parse(read('module.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(module.version, '0.1.2');
  assert.equal(pkg.version, module.version);
  assert.equal(module.license, 'AGPL-3.0-or-later');
  assert.match(read('LICENSE'), /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(read('LICENSE-NOTICE'), /any later version/);
});

test('icon choices include frames, emoji, built-in icons and self-contained artwork', () => {
  assert.equal(HUD_ICONS.frame.value, '🖼️');
  assert.deepEqual(new Set(Object.values(HUD_ICONS).map(value => value.kind)),
    new Set(['emoji', 'fa', 'svg']));
  for (const choice of Object.values(HUD_ICONS).filter(value => value.kind === 'svg')) {
    assert.match(read(`assets/${choice.value}`), /<svg/);
  }
});

test('defaults are 225px shared thumbnails, frame icon and no image captions', () => {
  const original = globalThis.game;
  const settings = new Map();
  try {
    globalThis.game = {
      settings: {
        register: (_id, key, value) => settings.set(key, value),
        registerMenu: () => {}
      }
    };
    const menus = new Map();
    globalThis.game.settings.registerMenu = (_id, key, value) => menus.set(key, value);
    class Thumbnails {}
    registerSettings(class {}, Thumbnails, () => {});
    assert.equal(settings.get(SETTING.icon).default, 'frame');
    assert.equal(settings.get(SETTING.width).default, 225);
    assert.equal(settings.get(SETTING.height).default, 225);
    assert.equal(settings.get(SETTING.height).config, false);
    assert.equal(settings.get(SETTING.width).config, false);
    assert.equal(settings.get(SETTING.linked).config, false);
    assert.equal(settings.get('thumbnailSize').default, 225);
    assert.equal(settings.get('thumbnailSize').scope, 'user');
    assert.equal(settings.get('thumbnailSize').config, false);
    assert.equal(settings.get('thumbnailAdvanced').default, false);
    assert.equal(settings.get('thumbnailAdvanced').scope, 'user');
    assert.equal(menus.get('thumbnailControls').type, Thumbnails);
    assert.equal(menus.get('thumbnailControls').restricted, false);
    assert.equal(settings.get(SETTING.captions).default, false);
    assert.equal(settings.get(SETTING.advanced).scope, 'client');
    assert.equal(settings.get(SETTING.icon).scope, 'client');
  } finally {
    if (original === undefined) delete globalThis.game;
    else globalThis.game = original;
  }
});

test('no image-checkerboard or selected-image footer remains', () => {
  const css = read('styles/main.css');
  assert.doesNotMatch(css, /repeating-conic-gradient/);
  assert.doesNotMatch(css, /content:\s*['"]✓/);
  assert.match(css, /\.rcp-thumbnail\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.rcp-tile::after\s*\{[^}]*content:\s*none/s);
});

test('settings labels in both locales exclude the old personal suffix', () => {
  for (const lang of ['en', 'de']) {
    const { RCP } = JSON.parse(read(`lang/${lang}.json`));
    for (const item of Object.values(RCP.settings)) {
      assert.doesNotMatch(item.name, /\((?:personal|persönlich)\)/i);
    }
  }
});
