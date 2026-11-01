// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THUMBNAIL_SIZE, normalizeThumbnailSize, thumbnailDimensions,
  updateVisibleThumbnailSize, applyWindowOpacity, migrateLegacyThumbnailPreferences
} from '../scripts/thumbnail-size.mjs';

function settingFixture(overrides = {}) {
  const settings = new Map(Object.entries({
    linkedSizes: true, thumbWidth: 225, thumbHeight: 225,
    thumbnailSize: 225, thumbnailAdvanced: false,
    thumbnailWidth: 0, thumbnailHeight: 0, thumbnailMigrated: false,
    ...overrides
  }));
  const writes = [];
  const original = globalThis.game;
  globalThis.game = {
    settings: {
      get: (_module, key) => settings.get(key),
      set: async (_module, key, value) => { writes.push([key, value]); settings.set(key, value); }
    }
  };
  return {
    settings, writes,
    restore: () => original === undefined ? delete globalThis.game : (globalThis.game = original)
  };
}

test('single slider defaults to a large square and clamps/snap correctly', () => {
  assert.equal(THUMBNAIL_SIZE.default, 225);
  assert.equal(normalizeThumbnailSize(-10), 85);
  assert.equal(normalizeThumbnailSize(300), 245);
  assert.equal(normalizeThumbnailSize(228), 225);
  assert.equal(normalizeThumbnailSize(undefined), 225);
  assert.deepEqual(thumbnailDimensions(), { width: 225, height: 225 });
  assert.deepEqual(thumbnailDimensions({ size: 195, advanced: false, width: 125, height: 155 }), { width: 195, height: 195 });
  assert.deepEqual(thumbnailDimensions({ size: 195, advanced: true, width: 125, height: 155 }), { width: 125, height: 155 });
  assert.deepEqual(thumbnailDimensions({ size: 195, advanced: true, width: 0, height: 0 }), { width: 195, height: 195 });
});

test('no migration writes occur on clean installation', async () => {
  const f = settingFixture();
  try {
    assert.equal(await migrateLegacyThumbnailPreferences(), false);
    assert.deepEqual(f.writes, []);
  } finally { f.restore(); }
});

test('legacy linked size is preserved in single slider without overwriting other preferences', async () => {
  const f = settingFixture({ thumbWidth: 175 });
  try {
    assert.equal(await migrateLegacyThumbnailPreferences(), true);
    assert.equal(f.settings.get('thumbnailSize'), 175);
    assert.equal(f.settings.get('thumbnailAdvanced'), false);
    assert.equal(f.settings.get('thumbnailMigrated'), true);
    const count = f.writes.length;
    assert.equal(await migrateLegacyThumbnailPreferences(), false);
    assert.equal(f.writes.length, count);
  } finally { f.restore(); }
});

test('legacy independent widths and heights migrate as separate sliders', async () => {
  const f = settingFixture({ linkedSizes: false, thumbWidth: 135, thumbHeight: 205 });
  try {
    assert.equal(await migrateLegacyThumbnailPreferences(), true);
    assert.deepEqual(thumbnailDimensions({
      size: f.settings.get('thumbnailSize'),
      advanced: f.settings.get('thumbnailAdvanced'),
      width: f.settings.get('thumbnailWidth'),
      height: f.settings.get('thumbnailHeight')
    }), { width: 135, height: 205 });
  } finally { f.restore(); }
});

test('migration never overwrites already configured modern user values', async () => {
  const f = settingFixture({ linkedSizes: false, thumbWidth: 135, thumbHeight: 205, thumbnailSize: 245 });
  try {
    await migrateLegacyThumbnailPreferences();
    assert.equal(f.settings.get('thumbnailSize'), 245);
    assert.equal(f.settings.get('thumbnailAdvanced'), false);
  } finally { f.restore(); }
});

test('live thumbnail size writes only CSS variables, no remote calls', () => {
  const calls = [];
  const frame = {
    style: { setProperty: (name, value) => calls.push([name, value]) }
  };
  const original = globalThis.document;
  try {
    globalThis.document = { querySelectorAll: () => [frame] };
    updateVisibleThumbnailSize({ size: 225, advanced: true, width: 105, height: 245 });
    assert.deepEqual(calls, [['--rcp-thumb-width', '105px'], ['--rcp-thumb-height', '245px']]);
  } finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
});

test('opacity only affects background-layer variable and transparent window class', () => {
  const props = [];
  const classes = [];
  const frame = {
    style: { setProperty: (...args) => props.push(args) },
    classList: { toggle: (...args) => classes.push(args) }
  };
  applyWindowOpacity(frame, 0);
  applyWindowOpacity(frame, 75);
  assert.deepEqual(props, [['--rcp-opacity', '0'], ['--rcp-opacity', '0.75']]);
  assert.deepEqual(classes, [['rcp-window-transparent', true], ['rcp-window-transparent', false]]);
});
