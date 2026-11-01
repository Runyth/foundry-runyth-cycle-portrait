// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSafePath, fallbackPattern, globExpression, discoverImages, regexFilter,
  makeFileRepository, filename, isImagePath
} from '../scripts/files.mjs';

test('validates unsafe file paths and supports all image types', () => {
  for (const path of ['javascript:alert(1)', 'data:image/png;base64,AA', '../image.webp', 'a/../b.png', 'a/%2e%2e/b.png', 'file:///a.png', '//evil.com/a.png']) {
    assert.throws(() => assertSafePath(path));
  }
  assert.equal(assertSafePath('portraits/A.webp'), 'portraits/A.webp');
  assert.equal(assertSafePath('', { allowEmpty: true }), '');
  assert.equal(isImagePath('portraits/A.AVIF'), true);
  assert.equal(isImagePath('portraits/A.exe'), false);
  assert.equal(fallbackPattern('a/b/c.png'), 'a/b/*');
  assert.equal(filename('a/foo%20bar.png'), 'foo bar.png');
});

test('wildcards match filename prefixes, brace extension variants and exact paths', () => {
  assert.equal(globExpression('a/Body_*.webp').test('a/Body_1.webp'), true);
  assert.equal(globExpression('a/Body_*.webp').test('b/Body_1.webp'), false);
  assert.equal(globExpression('a/*.{png,webp}').test('a/x.webp'), true);
  assert.equal(globExpression('a/*.{png,webp}').test('a/x.gif'), false);
  assert.equal(globExpression('a/??.png').test('a/ab.png'), true);
  assert.throws(() => globExpression('a/{a,{b}}.png'));
});

test('discovers Foundry file picker results, deduplicates and sorts naturally', async () => {
  let args;
  const files = await discoverImages('a/Body_*.webp', {
    browse: async (...parts) => {
      args = parts;
      return { files: ['a/Body_10.webp', 'a/Body_2.webp', 'a/Body_2.webp', 'a/Face_1.webp', 'a/Body_1.png'] };
    }
  });
  assert.equal(args[0], 'data');
  assert.equal(args[2].wildcard, true);
  assert.deepEqual(files, ['a/Body_2.webp', 'a/Body_10.webp']);
  assert.deepEqual(await discoverImages('a/single.png'), ['a/single.png']);
  await assert.rejects(() => discoverImages('https://example.org/*.png'));
});

test('falls back to a directory listing when wildcard enumeration is unsupported', async () => {
  const calls = [];
  const images = await discoverImages('a/*.{png,webp}', {
    browse: async (_source, path, options) => {
      calls.push([path, options.wildcard]);
      return path === 'a' ? { files: ['a/A.png', 'a/B.webp', 'a/C.gif'] } : { files: [] };
    }
  });
  assert.deepEqual(calls, [['a/*.{png,webp}', true], ['a', false]]);
  assert.deepEqual(images, ['a/A.png', 'a/B.webp']);
});

test('file cache shares concurrent requests and expires', async () => {
  let count = 0;
  let time = 50;
  const repo = makeFileRepository({
    browse: async () => { count++; await Promise.resolve(); return { files: ['a/a.webp'] }; },
    now: () => time,
    ttl: 20
  });
  await Promise.all([repo.list('a/*.webp'), repo.list('a/*.webp')]);
  assert.equal(count, 1);
  await repo.list('a/*.webp');
  assert.equal(count, 1);
  time = 100;
  await repo.list('a/*.webp');
  assert.equal(count, 2);
});

test('literal filenames and regex filtering', () => {
  assert.equal(regexFilter('Foo.?')('FOO.?webp'), true);
  assert.equal(regexFilter('Foo.?')('fooaw'), false);
  assert.equal(regexFilter('^Body_.*\\.webp$', { regex: true })('Body_7.webp'), true);
  assert.throws(() => regexFilter('(', { regex: true }));
  assert.throws(() => regexFilter('(a+)+', { regex: true }));
});
