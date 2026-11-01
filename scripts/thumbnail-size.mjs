// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** Self-contained per-user thumbnail sizing and no-rerender live previews. */
import { MODULE_ID } from './files.mjs';

export const THUMBNAIL_SIZE = Object.freeze({ min: 85, max: 245, step: 10, default: 225 });

export function normalizeThumbnailSize(value) {
  if (value === null || value === undefined || value === '') return THUMBNAIL_SIZE.default;
  const number = Number(value);
  if (!Number.isFinite(number)) return THUMBNAIL_SIZE.default;
  const bounded = Math.max(THUMBNAIL_SIZE.min, Math.min(THUMBNAIL_SIZE.max, number));
  return Math.min(THUMBNAIL_SIZE.max, THUMBNAIL_SIZE.min + Math.round((bounded - THUMBNAIL_SIZE.min) / THUMBNAIL_SIZE.step) * THUMBNAIL_SIZE.step);
}

/** Unset independent dimensions inherit the shared size without losing old values. */
export function thumbnailDimensions({ size = THUMBNAIL_SIZE.default, advanced = false, width = 0, height = 0 } = {}) {
  const shared = normalizeThumbnailSize(size);
  const individual = candidate => candidate !== null && candidate !== undefined && candidate !== '' &&
    Number.isFinite(Number(candidate)) && Number(candidate) > 0 ? normalizeThumbnailSize(candidate) : shared;
  return {
    width: advanced ? individual(width) : shared,
    height: advanced ? individual(height) : shared
  };
}

export function readThumbnailPreferences() {
  const get = key => game.settings.get(MODULE_ID, key);
  return {
    size: get('thumbnailSize'),
    advanced: Boolean(get('thumbnailAdvanced')),
    width: get('thumbnailWidth'),
    height: get('thumbnailHeight')
  };
}

/** Only update CSS geometry; never refresh files or rerender gallery content. */
export function updateVisibleThumbnailSize(preferences = readThumbnailPreferences()) {
  const { width, height } = thumbnailDimensions(preferences);
  if (typeof document === 'undefined') return;
  for (const frame of document.querySelectorAll('.runyth-cycle-portrait-app')) {
    frame.style.setProperty('--rcp-thumb-width', `${width}px`);
    frame.style.setProperty('--rcp-thumb-height', `${height}px`);
  }
}

export function normalizeWindowOpacity(value) {
  if (value === null || value === undefined || value === '') return 100;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(0, Math.min(100, numeric));
}

/** Change the window backing layer only. Never fade thumbnails or controls. */
export function applyWindowOpacity(frame, value) {
  if (!frame) return;
  const opacity = normalizeWindowOpacity(value);
  frame.style.setProperty('--rcp-opacity', String(opacity / 100));
  frame.classList.toggle('rcp-window-transparent', opacity === 0);
}

export function updateVisibleWindowOpacity(value) {
  if (typeof document === 'undefined') return;
  for (const frame of document.querySelectorAll('.runyth-cycle-portrait-app')) {
    applyWindowOpacity(frame, value);
  }
}

/** Preserve 0.1.0's client-scoped sizing on first launch after upgrade.
 * Defaults are not written, keeping new installations free of unnecessary writes.
 * User-scoped state takes precedence if the migration was interrupted. */
export async function migrateLegacyThumbnailPreferences() {
  const get = key => game.settings.get(MODULE_ID, key);
  if (get('thumbnailMigrated')) return false;
  const linked = Boolean(get('linkedSizes'));
  const legacyWidth = normalizeThumbnailSize(get('thumbWidth'));
  const legacyHeight = normalizeThumbnailSize(get('thumbHeight'));
  const nonDefault = !linked || legacyWidth !== THUMBNAIL_SIZE.default || legacyHeight !== THUMBNAIL_SIZE.default;
  const newValueAlreadySet = get('thumbnailAdvanced') || get('thumbnailSize') !== THUMBNAIL_SIZE.default ||
    Number(get('thumbnailWidth')) > 0 || Number(get('thumbnailHeight')) > 0;
  if (!nonDefault && !newValueAlreadySet) return false;
  if (!newValueAlreadySet) {
    await game.settings.set(MODULE_ID, 'thumbnailSize', legacyWidth);
    if (!linked) {
      // Write axis values before exposing independent mode in the settings UI.
      await game.settings.set(MODULE_ID, 'thumbnailWidth', legacyWidth);
      await game.settings.set(MODULE_ID, 'thumbnailHeight', legacyHeight);
      await game.settings.set(MODULE_ID, 'thumbnailAdvanced', true);
    }
  }
  await game.settings.set(MODULE_ID, 'thumbnailMigrated', true);
  updateVisibleThumbnailSize();
  return true;
}
