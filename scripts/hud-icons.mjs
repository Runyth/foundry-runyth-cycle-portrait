// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** A fixed, self-contained set of HUD symbols; setting values never become markup. */
import { MODULE_ID } from './files.mjs';

export const HUD_ICONS = Object.freeze({
  frame: { kind: 'emoji', value: '🖼️', label: '🖼️ Frame (default)' },
  theatre: { kind: 'emoji', value: '🎭', label: '🎭 Theatre masks' },
  camera: { kind: 'emoji', value: '📷', label: '📷 Camera' },
  palette: { kind: 'emoji', value: '🎨', label: '🎨 Artist palette' },
  cycle: { kind: 'emoji', value: '🔄', label: '🔄 Cycle' },
  joker: { kind: 'emoji', value: '🃏', label: '🃏 Joker' },
  picture: { kind: 'emoji', value: '🏞️', label: '🏞️ Landscape' },
  'fa-image': { kind: 'fa', value: 'fa-image', label: 'Icon: Image' },
  'fa-images': { kind: 'fa', value: 'fa-images', label: 'Icon: Gallery' },
  'fa-camera': { kind: 'fa', value: 'fa-camera', label: 'Icon: Camera' },
  'fa-palette': { kind: 'fa', value: 'fa-palette', label: 'Icon: Palette' },
  'fa-user': { kind: 'fa', value: 'fa-user', label: 'Icon: Character' },
  'fa-rotate': { kind: 'fa', value: 'fa-arrows-rotate', label: 'Icon: Rotate' },
  'svg-frame': { kind: 'svg', value: 'frame.svg', label: 'Artwork: Minimal frame' },
  'svg-gallery': { kind: 'svg', value: 'gallery.svg', label: 'Artwork: Gallery' },
  'svg-portrait': { kind: 'svg', value: 'portrait.svg', label: 'Artwork: Portrait' }
});

export function setHudIcon(button, choice) {
  const spec = HUD_ICONS[choice] ?? HUD_ICONS.frame;
  let node;
  if (spec.kind === 'fa') {
    node = document.createElement('i');
    node.className = `fa-solid ${spec.value}`;
  } else if (spec.kind === 'svg') {
    node = document.createElement('img');
    node.className = 'rcp-hud-svg';
    node.src = `modules/${MODULE_ID}/assets/${spec.value}`;
    node.alt = '';
  } else {
    node = document.createElement('span');
    node.className = 'rcp-hud-emoji';
    node.textContent = spec.value;
  }
  node.setAttribute('aria-hidden', 'true');
  button.replaceChildren(node);
}

export function updateVisibleHudIcons(choice) {
  if (typeof document === 'undefined') return;
  for (const button of document.querySelectorAll('[data-runyth-cycle-portrait]')) {
    setHudIcon(button, choice);
  }
}
