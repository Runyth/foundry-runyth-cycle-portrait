// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
/** Runyth Cycle Portrait entrypoint: independent Foundry v13 integration. */
import { MODULE_ID, makeFileRepository } from './files.mjs';
import { createPortraitService } from './service.mjs';
import { registerSettings, SETTING, pref } from './settings.mjs';
import { HelpWindow } from './help.mjs';
import { openGallery, refreshAppearance, updateOpenGalleries } from './gallery.mjs';
import { installHud } from './hud.mjs';
import { installPrototypeControls } from './prototype.mjs';
import { ThumbnailSettingsWindow } from './thumbnail-settings.mjs';
import { migrateLegacyThumbnailPreferences } from './thumbnail-size.mjs';

Hooks.once('init', () => { registerSettings(HelpWindow, ThumbnailSettingsWindow, refreshAppearance); });

Hooks.once('ready', () => {
  const Picker = foundry.applications.apps.FilePicker;
  const repository = makeFileRepository({ browse: (source, path, options) => Picker.browse(source, path, options) });
  const service = createPortraitService({
    user: () => game.user,
    allowed: () => pref(SETTING.owners),
    hooks: (name, payload) => Hooks.callAll(name, payload),
    listFiles: (pattern, options) => repository.list(pattern, options)
  });
  const api = Object.freeze({
    open: (actor, token = null) => openGallery(actor, token, service),
    images: (actor, options = {}) => service.images(actor, options),
    choose: (actor, image, options = {}) => service.change(actor, image, options),
    setPattern: (actor, pattern, options = {}) => service.setPattern(actor, pattern, options),
    help: () => new HelpWindow().render(true)
  });
  game.modules.get(MODULE_ID).api = api;
  installHud(service, openGallery);
  installPrototypeControls(service);
  Hooks.on('updateActor', (actor, changes) => {
    if (Object.hasOwn(changes, 'img')) updateOpenGalleries(actor);
    if (changes.flags?.[MODULE_ID]) repository.invalidate();
  });
  // Migration may need user-setting writes. Do not delay the HUD hook or public API.
  void migrateLegacyThumbnailPreferences().catch(error => {
    console.warn(`${MODULE_ID} | Could not migrate older thumbnail preferences`, error);
  });
  console.info(`${MODULE_ID} | Ready`);
});
