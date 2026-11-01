/** Accessible per-user slider dialog, using only the Foundry ApplicationV2 API. */
import { MODULE_ID } from './files.mjs';
import { t } from './settings.mjs';
import {
  THUMBNAIL_SIZE, normalizeThumbnailSize, readThumbnailPreferences,
  thumbnailDimensions, updateVisibleThumbnailSize
} from './thumbnail-size.mjs';

export class ThumbnailSettingsWindow extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-thumbnail-settings`,
    classes: ['runyth-cycle-portrait-thumbnail-settings'],
    window: { title: 'RCP.thumbnail.menuName', resizable: true, icon: 'fa-solid fa-expand' },
    position: { width: 460, height: 355 }
  };

  async _renderHTML() {
    const state = { ...readThumbnailPreferences() };
    const root = document.createElement('section');
    root.className = 'rcp-size-controls';
    const paragraph = document.createElement('p');
    paragraph.textContent = t('thumbnail.description');
    root.append(paragraph);

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'rcp-size-toggle';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = state.advanced;
    toggleLabel.append(toggle, document.createTextNode(t('thumbnail.separate')));
    root.append(toggleLabel);

    const sliders = new Map();
    for (const [key, label] of [['size', 'both'], ['width', 'width'], ['height', 'height']]) {
      const section = document.createElement('div');
      section.className = `rcp-size-slider rcp-size-${key}`;
      const labelElement = document.createElement('label');
      const output = document.createElement('output');
      const input = document.createElement('input');
      input.type = 'range';
      input.id = `rcp-thumbnail-${key}`;
      input.min = String(THUMBNAIL_SIZE.min);
      input.max = String(THUMBNAIL_SIZE.max);
      input.step = String(THUMBNAIL_SIZE.step);
      labelElement.htmlFor = input.id;
      labelElement.append(document.createTextNode(t(`thumbnail.${label}`)), output);
      section.append(labelElement, input);
      root.append(section);
      sliders.set(key, { section, input, output });
    }
    const help = document.createElement('p');
    help.className = 'rcp-size-hint';
    help.textContent = t('thumbnail.hint');
    root.append(help);

    const sync = () => {
      const resolved = thumbnailDimensions(state);
      const values = { size: normalizeThumbnailSize(state.size), ...resolved };
      toggle.checked = state.advanced;
      for (const [key, { section, input, output }] of sliders) {
        input.value = String(values[key]);
        output.textContent = `${values[key]} px`;
        section.hidden = state.advanced ? key === 'size' : key !== 'size';
      }
      updateVisibleThumbnailSize(state);
    };

    // Serialize network-backed user-settings updates to prevent rapid slider
    // interactions from writing an older value after a newer one.
    let writes = Promise.resolve();
    const revisions = new Map();
    const change = key => revisions.set(key, (revisions.get(key) ?? 0) + 1);
    const save = (name, value, key) => {
      const revision = revisions.get(key);
      writes = writes.catch(() => {}).then(async () => {
        try {
          await game.settings.set(MODULE_ID, name, value);
        } catch (error) {
          if (revisions.get(key) === revision) {
            state[key] = game.settings.get(MODULE_ID, name);
            sync();
          }
          ui.notifications.error(`${MODULE_ID}: ${error.message}`);
        }
      });
    };

    toggle.addEventListener('change', () => {
      state.advanced = toggle.checked;
      change('advanced');
      sync();
      save('thumbnailAdvanced', state.advanced, 'advanced');
    });
    for (const [key, { input }] of sliders) {
      input.addEventListener('input', () => {
        state[key] = normalizeThumbnailSize(input.value);
        change(key);
        sync();
      });
      input.addEventListener('change', () => {
        state[key] = normalizeThumbnailSize(input.value);
        change(key);
        sync();
        const name = key === 'size' ? 'thumbnailSize' : `thumbnail${key[0].toUpperCase()}${key.slice(1)}`;
        save(name, state[key], key);
      });
    }
    sync();
    return root;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }
}
