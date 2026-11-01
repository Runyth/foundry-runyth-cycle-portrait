#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
"""Browser fixture for themed window paint and responsive per-user thumbnail controls."""
from __future__ import annotations

import asyncio
import base64
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


def module_url(path: Path, cache: dict[Path, str]) -> str:
  path = path.resolve()
  if path in cache:
    return cache[path]
  code = path.read_text(encoding='utf-8')

  def resolve(match: re.Match[str]) -> str:
    return 'from ' + json.dumps(module_url(path.parent / match.group(2), cache))

  code = re.sub(r'from\s+(["\'])(\.[^"\']+)\1', resolve, code)
  uri = 'data:text/javascript;base64,' + base64.b64encode(code.encode()).decode()
  cache[path] = uri
  return uri


async def main() -> None:
  cache: dict[Path, str] = {}
  urls = {key: module_url(ROOT / f'scripts/{name}.mjs', cache)
          for key, name in [('slider', 'thumbnail-settings'), ('size', 'thumbnail-size')]}
  async with async_playwright() as playwright:
    browser = await playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    try:
      page = await browser.new_page(viewport={'width': 1050, 'height': 800})
      await page.set_content('<!doctype html><html><head></head><body></body></html>')
      await page.add_style_tag(content=(ROOT / 'styles/main.css').read_text())
      results = await page.evaluate('''async urls => {
        const checks = [];
        const assert = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
        const values = new Map([
          ['thumbnailSize', 225], ['thumbnailAdvanced', false],
          ['thumbnailWidth', 0], ['thumbnailHeight', 0], ['opacity', 100]
        ]);
        const writes = [];
        globalThis.game = {
          settings: {
            get: (_id, key) => values.get(key),
            set: async (_id, key, value) => { values.set(key, value); writes.push([key, value]); }
          },
          i18n: { localize: key => key }
        };
        globalThis.ui = { notifications: { error: message => { throw new Error(message); } } };
        globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
        const { ThumbnailSettingsWindow } = await import(urls.slider);
        const size = await import(urls.size);

        // The real gallery has two native window content children over a single
        // Foundry-theme surface. Neither the image nor the controls may fade.
        const frame = document.createElement('div');
        frame.className = 'runyth-cycle-portrait-app';
        frame.style.cssText = 'position:absolute;top:20px;left:15px;width:650px;height:440px;--background:#765432';
        frame.innerHTML = '<header class="window-header">Header</header><div class="window-content">' +
          '<section class="rcp-shell"><div class="rcp-gallery"><button class="rcp-tile"><img class="rcp-thumbnail"></button></div></section></div>';
        document.body.append(frame);
        size.updateVisibleThumbnailSize();
        const image = frame.querySelector('img');
        const tile = frame.querySelector('button');
        const pseudo = () => getComputedStyle(frame, '::before');
        const nativeColor = getComputedStyle(document.createElement('div')).backgroundColor;
        assert(pseudo().backgroundColor === 'rgb(118, 84, 50)', 'Foundry theme color used instead of fixed grey');
        assert(tile.getBoundingClientRect().width >= 225, 'initial tile fits 225 px preview');
        size.applyWindowOpacity(frame, 0);
        assert(pseudo().opacity === '0', 'zero opacity hides only themed background');
        assert(frame.classList.contains('rcp-window-transparent'), 'transparent window flag enabled');
        assert(getComputedStyle(image).opacity === '1', 'image stays fully opaque');
        assert(getComputedStyle(tile).opacity === '1', 'controls stay fully opaque');
        size.applyWindowOpacity(frame, 80);
        assert(pseudo().opacity === '0.8', 'themed background opacity is restored');
        assert(!frame.classList.contains('rcp-window-transparent'), 'transparent flag cleared');
        assert(getComputedStyle(frame.querySelector('.window-content')).backgroundColor === 'rgba(0, 0, 0, 0)',
          'content does not cover theme surface with another color');

        const settings = new ThumbnailSettingsWindow();
        const content = await settings._renderHTML();
        document.body.append(content);
        const input = name => content.querySelector(`#rcp-thumbnail-${name}`);
        const shared = content.querySelector('.rcp-size-size');
        const width = content.querySelector('.rcp-size-width');
        const height = content.querySelector('.rcp-size-height');
        const toggle = content.querySelector('.rcp-size-toggle input');
        assert(!shared.hidden && width.hidden && height.hidden, 'one shared slider shown by default');
        assert(input('size').value === '225', 'single slider defaults to 225 px');
        const originalTile = tile.getBoundingClientRect().width;
        input('size').value = '165';
        input('size').dispatchEvent(new Event('input', { bubbles: true }));
        assert(frame.style.getPropertyValue('--rcp-thumb-width') === '165px', 'shared slider immediately updates width');
        assert(frame.style.getPropertyValue('--rcp-thumb-height') === '165px', 'shared slider immediately updates height');
        assert(tile.getBoundingClientRect().width < originalTile, 'real thumbnail tile resizes live');
        input('size').dispatchEvent(new Event('change', { bubbles: true }));
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        assert(shared.hidden && !width.hidden && !height.hidden, 'independent sliders appear when toggled');
        assert(input('width').value === '165' && input('height').value === '165', 'new independent sliders inherit shared size');
        for (const [key, value] of [['width', 125], ['height', 235]]) {
          input(key).value = String(value);
          input(key).dispatchEvent(new Event('input', { bubbles: true }));
          input(key).dispatchEvent(new Event('change', { bubbles: true }));
        }
        assert(frame.style.getPropertyValue('--rcp-thumb-width') === '125px', 'independent width preview');
        assert(frame.style.getPropertyValue('--rcp-thumb-height') === '235px', 'independent height preview');
        assert(getComputedStyle(image).height === '235px', 'image viewport obeys independent height');
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        assert(!shared.hidden && width.hidden && height.hidden, 'shared slider restored when toggled off');
        assert(frame.style.getPropertyValue('--rcp-thumb-width') === '165px', 'shared size retained independently');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        assert(input('width').value === '125' && input('height').value === '235', 'separate axis values retained when toggled back');
        await new Promise(resolve => setTimeout(resolve, 30));
        assert(values.get('thumbnailSize') === 165 && values.get('thumbnailAdvanced') === true,
          'serialized user settings persist active size and mode');
        assert(values.get('thumbnailWidth') === 125 && values.get('thumbnailHeight') === 235,
          'serialized user settings persist both independent sizes');
        assert(writes.every(([key]) => key.startsWith('thumbnail')), 'size controls never mutate Actor data');
        return checks;
      }''', urls)
      print(json.dumps({'passed': len(results), 'checks': results}, indent=2))
    finally:
      await browser.close()


if __name__ == '__main__':
  asyncio.run(main())
