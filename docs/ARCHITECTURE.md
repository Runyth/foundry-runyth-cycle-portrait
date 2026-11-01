# Architecture

## Modules

| File | Responsibility |
|---|---|
| `scripts/main.mjs` | Foundry lifecycle hooks and public API registration |
| `scripts/settings.mjs` | World and per-client settings, localization helpers |
| `scripts/files.mjs` | Image path validation, glob compilation, Foundry file listing, bounded cache |
| `scripts/service.mjs` | Authorization, per-Actor serialization, Actor.img updates, pattern writes |
| `scripts/hud.mjs` | Token HUD DOM control with source-Actor resolution |
| `scripts/hud-icons.mjs` | Whitelisted emoji, Font Awesome and local vector icon renderer |
| `scripts/hud-order.mjs` | Optional HUD control adjacency in normal/reversed layouts, with scoped observer |
| `assets/*.svg` | Original, self-contained HUD artwork |
| `scripts/prototype.mjs` | Optional appearance-tab pattern editor |
| `scripts/gallery.mjs` | ApplicationV2 gallery, search, incremental DOM rendering, geometry |
| `scripts/help.mjs` | ApplicationV2 resizable Help window |
| `styles/main.css` | Scoped presentation and responsive tile sizing |

## Data model

Portrait source: `Actor.flags.runyth-cycle-portrait.pattern` (optional string). The path is an exact image or wildcard. Clearing it restores source discovery beside `Actor.img`.

Portrait choice: `Actor.img` is updated only upon an explicit user action. Token texture, prototype texture, randomization options, and other Actors remain untouched. Scene tokens referring to an unlinked Actor resolve to the world's base Actor when possible.

Personal preferences: Foundry client-scoped settings. Window dimensions/position are maintained per browser via `localStorage`, with errors ignored when local storage is unavailable.

## Security and concurrency

- Native Foundry ownership checks are enforced when listing, selecting, or saving source patterns. GM exceptions follow Foundry's role model.
- Players changing an image must supply a token they own and an Actor they own; the global player permission gate is evaluated at the time of update.
- Selected files must match the Actor's currently resolved candidate set and be safe image paths.
- Source patterns cannot traverse parent directories and cannot use unsafe URL schemes.
- Concurrent updates to the same Actor are sequenced; failed operations do not leave their promises in the queue.
- Client-generated text is placed into DOM nodes through `textContent`, not interpolated HTML.
- The file listing is bounded to 3,000 entries per Actor source and cached for 15 seconds across repeated opens.
- Gallery tiles are appended in batches of 64, with image loading deferred by the browser.

## Integrations

Foundry v13 public APIs, hooks, and file-picker facilities are used. There are no required module dependencies and no core prototype monkey-patches. Cycle Token integration is optional and uses only its public DOM class / module identity to locate its own HUD button. The HUD observer is scoped to the current HUD, adjusts only this module’s button, and disconnects on canvas teardown. When no matching button exists, no reordering occurs. For the public interface see `API.md`.

## Limitations

- The implementation can be statically and unit tested without a running Foundry instance, but requires in-world v13 verification for Token HUD/layout and permissions across actual users.
- Wildcards that span nested subdirectories may depend on the file provider's native wildcard capabilities; local directory fallback does not recursively enumerate entire trees.
- Wildcard listings for arbitrary remote HTTP(S) directories are not provided.
