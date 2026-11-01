import { MODULE_ID } from './files.mjs';
import { HUD_ICONS, updateVisibleHudIcons } from './hud-icons.mjs';
import { THUMBNAIL_SIZE, updateVisibleThumbnailSize, updateVisibleWindowOpacity } from './thumbnail-size.mjs';

export const SETTING = Object.freeze({
  hud: 'hud', owners: 'allowOwners', icon: 'hudIcon',
  advanced: 'advanced', captions: 'captions', tooltips: 'tooltips', regex: 'regexMode',
  linked: 'linkedSizes', width: 'thumbWidth', height: 'thumbHeight',
  opacity: 'opacity'
});


export function pref(key) { return game.settings.get(MODULE_ID, key); }
export function t(key) { return game.i18n.localize(`RCP.${key}`); }

export function registerSettings(HelpApp, ThumbnailApp, onChange = () => {}) {
  const add = (key, name, scope, type, defaultValue, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `RCP.settings.${name}.name`, hint: `RCP.settings.${name}.hint`,
    scope, config: true, type, default: defaultValue, ...extra
  });
  add(SETTING.hud, 'hud', 'world', Boolean, true);
  add(SETTING.owners, 'owners', 'world', Boolean, true);
  add(SETTING.icon, 'icon', 'client', String, 'frame', {
    choices: Object.fromEntries(Object.entries(HUD_ICONS).map(([key, value]) => [key, value.label])),
    onChange: updateVisibleHudIcons
  });
  add(SETTING.regex, 'regex', 'client', Boolean, false, { config: false });
  add(SETTING.advanced, 'advanced', 'client', Boolean, false, { onChange });
  add(SETTING.captions, 'captions', 'client', Boolean, false, { onChange });
  add(SETTING.tooltips, 'tooltips', 'client', Boolean, true, { onChange });
  // Keep the former client-scoped controls exclusively as migration inputs.
  add(SETTING.linked, 'linked', 'client', Boolean, true, { config: false });
  add(SETTING.width, 'width', 'client', Number, THUMBNAIL_SIZE.default, { config: false });
  add(SETTING.height, 'height', 'client', Number, THUMBNAIL_SIZE.default, { config: false });
  // Match Cycle Token: one shared size slider, optional independent axes.
  // User scope retains separate values for different world users.
  const addSize = (key, type, value, onSizeChange) => game.settings.register(MODULE_ID, key, {
    scope: 'user', config: false, type, default: value, onChange: onSizeChange
  });
  for (const [key, value] of [
    ['thumbnailSize', THUMBNAIL_SIZE.default], ['thumbnailWidth', 0], ['thumbnailHeight', 0]
  ]) {
    addSize(key, Number, value, () => updateVisibleThumbnailSize());
  }
  addSize('thumbnailAdvanced', Boolean, false, () => updateVisibleThumbnailSize());
  addSize('thumbnailMigrated', Boolean, false);
  game.settings.registerMenu(MODULE_ID, 'thumbnailControls', {
    name: 'RCP.thumbnail.menuName', label: 'RCP.thumbnail.menuLabel',
    hint: 'RCP.thumbnail.menuHint', icon: 'fa-solid fa-expand',
    type: ThumbnailApp, restricted: false
  });
  add(SETTING.opacity, 'opacity', 'client', Number, 100, {
    onChange: updateVisibleWindowOpacity, range: { min: 0, max: 100, step: 5 }
  });
  game.settings.registerMenu(MODULE_ID, 'help', {
    name: 'RCP.settings.help.name', label: 'RCP.settings.help.label', hint: 'RCP.settings.help.hint',
    icon: 'fas fa-circle-question', type: HelpApp, restricted: false
  });
}
