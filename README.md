# Runyth Cycle Portrait

Version **0.1.2** · Foundry VTT **v13** · System-agnostic · **AGPL-3.0-or-later**

A self-contained Foundry VTT module for changing the **Actor portrait** with an image gallery opened from the Token HUD. The module has its own renderer, file resolution, permission checks, settings, and public API. There are no runtime module dependencies.

## Safety and scope

- **No installation-time image changes**: existing Actor portraits, scene token textures, prototype tokens, and Foundry random image settings are not modified.
- Selecting a gallery thumbnail updates **only `Actor.img`**. It does not change `TokenDocument.texture.src` or `Actor.prototypeToken`.
- Unlinked scene tokens resolve to their corresponding base world Actor, where available.
- GM or appropriately authorized owning players may change portraits. A player selecting through the Token HUD must own both token and base Actor.
- Explicit Actor-level image patterns are stored in `flags.runyth-cycle-portrait.pattern`, and do not alter Foundry's native token image behavior.

## Features

- Token HUD selector (🖼️ by default) with emoji, Font Awesome and original SVG icon choices.
- Simple thumbnail gallery by default; optional **per-player** advanced view.
- Filename substring search, optionally regex search with persistent mode.
- Wildcards including `*`, `?`, and `{png,webp}` alternatives; an exact path is also accepted.
- PNG, JPEG, WEBP, AVIF, GIF, and SVG imagery.
- Foundry's authorized file-browser API, including fallback directory listing for supported wildcard patterns.
- Thumbnail sizing from **85–245 px** (225 px by default), linked or independent width/height.
- Windows with adjustable **0–100% background opacity**; artwork, text, and controls remain opaque.
- Transparent thumbnails with no checkerboard or selection checkmark, optional filename-only captions and tooltips, keyboard-accessible tiles, lazy-loaded images, paged listing, and inline error feedback.
- Resizable picker and Help windows with local browser geometry memory.
- English and German localization.
- Public API plus a `runythCyclePortraitChanged` hook.
- No monkey-patching or global framework overrides.

## Installation

1. Extract `runyth-cycle-portrait-0.1.2-module.zip` into your Foundry user-data `Data/modules/` directory.
2. Verify the final path is `Data/modules/runyth-cycle-portrait/module.json`.
3. Restart Foundry VTT or reload the client; enable **Runyth Cycle Portrait** in Manage Modules.
4. Right-click an authorized Actor token and select **🖼️** in its Token HUD.
5. Choose a thumbnail to set the Actor portrait. Opening the picker or searching does not change anything.

For a narrower candidate set, set an Actor-specific pattern under **Actor → Prototype Token → Appearance** when the content is available, or enable **Use advanced gallery** and edit its Actor portrait source field. Saving the source pattern does not change artwork.

## Portrait patterns

| Example | Selection |
|---|---|
| *(empty)* | Find images in the folder of the Actor's current portrait |
| `portraits/Lilith/Head_*.webp` | All matching WEBP portrait variants |
| `portraits/Lilith/*.{png,webp}` | PNG and WEBP files in the folder |
| `portraits/Lilith/Head_?.jpg` | Names with exactly one character after `Head_` |
| `portraits/Lilith/Head_3.webp` | One explicit portrait |

HTTP(S) images may be used as an exact path. Remote wildcard enumeration is intentionally unsupported. The normal file browser respects Foundry's existing server permissions. One-directory patterns are recommended for the broadest storage-provider compatibility.

## Configuration

Open **Game Settings → Configure Settings → Runyth Cycle Portrait**. When both Runyth Cycle Token and Cycle Portrait are active, the Portrait HUD control appears immediately **below** Cycle Token on standard or reverse-ordered HUD layouts, including delayed HUD insertion. World settings control HUD availability and whether owning players may change portraits. Individual users control their HUD icon, advanced interface, regex preference, captions, tooltips, thumbnail dimensions, and window transparency.

See `docs/USER_GUIDE.md` for detailed usage, `docs/API.md` for integrations, and `docs/ARCHITECTURE.md` for implementation details.

## Validation

Run `npm test` and `npm run check` from the source directory. These commands use Node.js built-in functionality and do not require installing dependencies. They do **not** replace testing in a real Foundry v13 environment; see `docs/VALIDATION.md` for manual acceptance checks.

## Releases

The GitHub repository is
[`Runyth/foundry-runyth-cycle-portrait`](https://github.com/Runyth/foundry-runyth-cycle-portrait).
Every release attaches:

```text
runyth-cycle-portrait-v<version>-mod.zip
runyth-cycle-portrait-v<version>-src.zip
runyth-cycle-portrait-v<version>-doc.zip
module.json
runyth-cycle-portrait-v<version>-SHA256SUMS.txt
```

The `module.json` manifest download URL points at the matching release's installable
archive, and the marked Latest release is always the highest published version.

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

## References

- [Foundry VTT v13 ApplicationV2](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html)
- [Foundry VTT v13 TokenHUD](https://foundryvtt.com/api/v13/classes/foundry.applications.hud.TokenHUD.html)
- [Foundry VTT v13 FilePicker](https://foundryvtt.com/api/v13/classes/foundry.applications.apps.FilePicker.html)
- [Foundry VTT v13 PrototypeTokenConfig](https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.PrototypeTokenConfig.html)

## Thumbnail dimensions

Use **Configure Settings → Runyth Cycle Portrait → Thumbnail dimensions**.
The default single slider adjusts both width and height (225 px). Enable **Use separate width and height sliders** for independent axes. Changes preview immediately in all open galleries for your user without changing Actor images. Existing 0.1.0 thumbnail preferences are migrated once, where customized.

The gallery background follows the active Foundry window theme rather than using a fixed grey paint; the opacity control affects only that window surface. Set it to 0% to remove the surface without fading controls or portraits.

## Window positioning (0.1.2 fix)

The gallery and Help window use Foundry v13's native floating application positioning and z-order. A 0.1.1 CSS regression incorrectly made these windows flow into the right sidebar layout; 0.1.2 removes that override. Remembered positions are kept within the current viewport so old locations from the affected version cannot leave the window mostly off-screen. No manual reset is required.
