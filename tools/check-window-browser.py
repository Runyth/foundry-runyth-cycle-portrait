#!/usr/bin/env python3
"""Regression: floating V13 windows cannot displace Foundry's right sidebar.

This models Foundry's positioned .application roots in a flex UI shell. It
cannot replace an integration test inside a running Foundry v13 instance.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


async def main() -> None:
  async with async_playwright() as playwright:
    browser = await playwright.chromium.launch(
      headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    try:
      page = await browser.new_page(viewport={'width': 1200, 'height': 800})
      await page.set_content('''<!doctype html><html><head><style>
        body { margin: 0; }
        #interface { width: 1200px; height: 800px; display: flex; position: relative; }
        #canvas { flex: 1 1 auto; min-width: 0; }
        #sidebar { flex: 0 0 300px; background: #222; }
        /* Foundry V13 positions .application as a floating window. */
        .application { position: absolute; width: 620px; height: 510px;
          top: 60px; left: 150px; z-index: 100; }
      </style></head><body>
      <div id="interface"><div id="canvas"></div><aside id="sidebar"></aside></div>
      </body></html>''')
      before = await page.locator('#sidebar').bounding_box()
      await page.add_style_tag(content=(ROOT / 'styles/main.css').read_text())
      result = await page.evaluate('''() => {
        const checks = [];
        const assert = (condition, msg) => {
          if (!condition) throw new Error(msg);
          checks.push(msg);
        };
        const shell = document.getElementById('interface');
        const sidebar = document.getElementById('sidebar');
        const bounds = node => node.getBoundingClientRect();
        const before = bounds(sidebar);
        const build = (kind, left, top, zIndex) => {
          const root = document.createElement('section');
          root.className = 'application runyth-cycle-portrait-app' +
            (kind === 'help' ? ' rcp-help-window' : '');
          root.style.left = left + 'px';
          root.style.top = top + 'px';
          root.style.zIndex = String(zIndex);
          root.style.setProperty('--background', '#554433');
          root.innerHTML = '<header class="window-header">' + kind + '</header>' +
            '<main class="window-content"><div class="rcp-shell"></div></main>';
          shell.insertBefore(root, sidebar);
          return root;
        };
        const picker = build('picker', 150, 60, 120);
        assert(getComputedStyle(picker).position === 'absolute',
          'picker retains native absolute positioning');
        assert(bounds(sidebar).left === before.left && bounds(sidebar).width === before.width,
          'opening picker does not move or resize sidebar');
        assert(bounds(picker).left === 150 && bounds(picker).top === 60,
          'opening picker honors Foundry window coordinates');
        assert(getComputedStyle(picker, '::before').backgroundColor === 'rgb(85, 68, 51)',
          'native theme backdrop remains functional');
        picker.style.left = '20px';
        picker.style.top = '95px';
        assert(bounds(picker).left === 20 && bounds(picker).top === 95,
          'picker can be dragged left independently of sidebar');
        assert(bounds(sidebar).left === before.left,
          'moving picker does not move sidebar');
        const help = build('help', 260, 100, 180);
        assert(getComputedStyle(help).position === 'absolute',
          'help window also retains native floating positioning');
        assert(bounds(sidebar).left === before.left,
          'opening multiple floating windows does not move sidebar');
        picker.style.zIndex = '200';
        assert(getComputedStyle(picker).zIndex === '200',
          'Foundry can raise picker above other windows');
        assert(document.elementFromPoint(300, 105)?.closest('.application') === picker,
          'raised picker is interactable above overlapping help window');
        picker.remove();
        help.remove();
        assert(bounds(sidebar).left === before.left,
          'closing all windows leaves Foundry layout unchanged');
        return checks;
      }''')
      assert before['x'] == 900 and before['width'] == 300, before
      print(json.dumps({'passed': len(result), 'checks': result}, indent=2))
    finally:
      await browser.close()


if __name__ == '__main__':
  asyncio.run(main())
