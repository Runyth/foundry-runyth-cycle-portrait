#!/usr/bin/env python3
"""Exercise live browser DOM rules using Foundry-like fixtures (not a live world)."""
from __future__ import annotations

import asyncio
import base64
import re
import json
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


def module_url(path: Path, cache: dict[Path, str]) -> str:
  """Resolve local imports into browser-importable data URLs, without a server."""
  path = path.resolve()
  if path in cache:
    return cache[path]
  code = path.read_text(encoding='utf-8')
  # All production imports are plain relative ES imports; rewrite to a local data URL.
  def resolve(match: re.Match[str]) -> str:
    relative = match.group(2)
    return 'from ' + json.dumps(module_url(path.parent / relative, cache))
  code = re.sub(r'from\s+(["\'])(\.[^"\']+)\1', resolve, code)
  url = 'data:text/javascript;base64,' + base64.b64encode(code.encode()).decode()
  cache[path] = url
  return url


async def main() -> None:
  cache: dict[Path, str] = {}
  urls = {name: module_url(ROOT / f'scripts/{file}', cache) for name, file in {
    'hud': 'hud.mjs', 'icons': 'hud-icons.mjs', 'gallery': 'gallery.mjs'
  }.items()}
  try:
    async with async_playwright() as playwright:
      browser = await playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--allow-file-access-from-files'])
      try:
        page = await browser.new_page(viewport={'width': 1000, 'height': 800})
        await page.set_content('<!doctype html><html><head></head><body></body></html>')
        await page.add_style_tag(content=(ROOT / 'styles/main.css').read_text())
        results = await page.evaluate('''async MODULE_URLS => {
          
          const prefs = { hud: true, allowOwners: true, hudIcon: 'frame', advanced: false,
            captions: false, tooltips: true, linkedSizes: true, thumbWidth: 225,
            thumbHeight: 225, opacity: 100, regexMode: false };
          const events = new Map();
          globalThis.game = {
            user: { isGM: true },
            actors: new Map(),
            settings: { get: (_id, key) => prefs[key] },
            i18n: { localize: x => x },
          };
          globalThis.Hooks = {
            on: (key, handler) => {
              const a = events.get(key) ?? [];
              a.push(handler);
              events.set(key, a);
            }
          };
          globalThis.foundry = {
            applications: { api: { ApplicationV2: class { constructor() {} } } }
          };
          const [hudApi, icons, galleryModule] = await Promise.all([
            import(MODULE_URLS.hud), import(MODULE_URLS.icons),
            import(MODULE_URLS.gallery)
          ]);
          const actor = { id: 'test', uuid: 'Actor.test', name: 'Example',
            img: 'image-1.png', getFlag: () => '', testUserPermission: () => true };
          const token = { actor, document: { actorId: 'test', testUserPermission: () => true } };
          game.actors.set('test', actor);
          const getRoot = reversed => {
            const root = document.createElement('div');
            root.id = 'token-hud';
            root.className = 'token-hud';
            root.style.cssText = 'position:absolute;top:20px;left:20px;display:flex;gap:30px;';
            root.innerHTML = '<div class="col left" style="display:flex;flex-direction:column;gap:4px"></div>' +
              `<div class="col right" style="display:flex;flex-direction:${reversed ? 'column-reverse' : 'column'};gap:4px"></div>`;
            document.body.replaceChildren(root);
            return root;
          };
          const service = { images: async () => [], change: async () => {} };
          hudApi.installHud(service, () => {});
          const render = root => {
            const hud = { object: token, element: root };
            for (const handler of (events.get('renderTokenHUD') ?? [])) handler(hud, root);
          };
          const tick = async () => { await new Promise(resolve => setTimeout(resolve, 15)); };
          const checks = [];
          const assert = (condition, reason) => {
            if (!condition) throw new Error(reason);
            checks.push(reason);
          };
          const portraitSelector = '[data-runyth-cycle-portrait]';
          let root = getRoot(false);
          render(root);
          let portrait = root.querySelector(portraitSelector);
          assert(portrait?.textContent === '🖼️', 'default frame emoji');
          assert(portrait.parentElement.classList.contains('right'), 'normal placement without companion');
          // Late insertion in the opposite column: our control moves, not theirs.
          const emote = document.createElement('button');
          emote.className = 'control-icon emotes';
          emote.textContent = '🃏';
          root.querySelector('.left').append(emote);
          const tokenBtn = document.createElement('button');
          tokenBtn.className = 'control-icon runyth-cycle-token-hud';
          tokenBtn.textContent = '📸'; // Nondefault icon: never rely on Joker glyph.
          root.querySelector('.left').append(tokenBtn);
          await tick();
          assert(tokenBtn.nextElementSibling === portrait, 'late insertion with arbitrary icon');
          assert(emote.nextElementSibling === tokenBtn, 'other button remains undisturbed');
          render(root);
          assert(root.querySelectorAll(portraitSelector).length === 1, 'idempotent HUD render');
          // Visual ordering, including column-reverse, after a HUD replacement.
          root = getRoot(true);
          root.querySelector('.right').append(tokenBtn);
          render(root);
          await tick();
          portrait = root.querySelector(portraitSelector);
          assert(portrait.nextElementSibling === tokenBtn, 'reversed column DOM order');
          assert(portrait.getBoundingClientRect().top > tokenBtn.getBoundingClientRect().top,
            'reversed column visual position below token');
          prefs.hudIcon = 'fa-camera';
          icons.updateVisibleHudIcons(prefs.hudIcon);
          assert(portrait.querySelector('i.fa-camera') !== null, 'live Font Awesome icon switch');
          prefs.hudIcon = 'svg-frame';
          icons.updateVisibleHudIcons(prefs.hudIcon);
          assert(portrait.querySelector('img[src="modules/runyth-cycle-portrait/assets/frame.svg"]') !== null,
            'live bundled SVG icon switch');
          // A picture transparency test: no image checkerboard, no footer/checkmark.
          root = document.createElement('div');
          root.className = 'runyth-cycle-portrait-app';
          root.style.cssText = 'position:absolute;top:180px;left:20px;width:520px;height:420px;';
          document.body.append(root);
          const app = new galleryModule.PortraitGallery(actor, token, service);
          app.element = root;
          app._size();
          const content = await app._renderHTML();
          root.append(content);
          app.filtered = ['data:image/png;test'];
          app._paginate();
          let tile = root.querySelector('.rcp-tile');
          const thumbnail = tile.querySelector('img');
          assert(tile.offsetWidth >= 225 && thumbnail.offsetWidth === 225, 'large default thumbnails');
          assert(getComputedStyle(thumbnail).backgroundImage === 'none', 'no checkerboard on image');
          assert(getComputedStyle(thumbnail).backgroundColor === 'rgba(0, 0, 0, 0)', 'image transparency maintained');
          assert(getComputedStyle(tile).backgroundColor === 'rgba(0, 0, 0, 0)', 'tile transparency maintained');
          assert(tile.querySelector('.rcp-caption') === null, 'no captions unless enabled');
          tile.classList.add('is-current');
          assert(getComputedStyle(tile, '::after').content === 'none', 'selected tile has no checkmark/footer');
          prefs.captions = true;
          app.filtered = ['portrait.png'];
          app.displayed = 0;
          root.querySelector('.rcp-gallery').replaceChildren();
          app._paginate();
          assert(root.querySelectorAll('.rcp-caption').length === 1, 'filename-only optional caption');
          return checks;
        }''', urls)
        print(json.dumps({'passed': len(results), 'checks': results}, indent=2))
      finally:
        await browser.close()
  finally:
    pass


if __name__ == '__main__':
  asyncio.run(main())
