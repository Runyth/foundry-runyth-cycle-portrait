# Release 0.1.2

- Patch update of the independent Foundry v13 implementation; the initial baseline was 0.1.0.
- System-agnostic; verified compatibility is declared at Foundry major version 13 only.
- Self-contained ES modules, CSS, localization and AGPL-3.0-or-later LICENSE.
- Automated verification includes 31 Node.js tests, `node --check`, 16 HUD/thumbnail Chromium checks, 25 theme/sizing checks, and 11 window-layout regression checks.
- Integration with an actual Foundry instance and cross-user UI permissions requires manual acceptance testing.

## Archive layout

- `runyth-cycle-portrait-0.1.2-module.zip`: installable `runyth-cycle-portrait/` containing manifest, runtime scripts, CSS, languages, LICENSE and README.
- `runyth-cycle-portrait-0.1.2-source.zip`: complete source directory plus actual `.git` repository history and tests.
- `runyth-cycle-portrait-0.1.2-documentation.zip`: README, CHANGELOG, LICENSE and detailed documentation.

The runtime package does not require `npm install` and does not load any Node dependencies.

## Version reset and release changes

- Restart numbering from 0.1.0. The source repository preserves earlier development commits, but this is the new numbered release baseline.
- License all released source and distributed assets under AGPL-3.0-or-later, with full license text.
- Default frame emoji and additional emoji, Font Awesome and original SVG HUD choices.
- Portrait button stays immediately below the Cycle Token button by stable DOM identity, including late insertion and reversed flex columns.
- Fully transparent thumbnail backgrounds, no checkmark/footer, and larger 225 px defaults.
- Remove setting name suffixes (0.1.0); in 0.1.1, thumbnail dimensions move to user scope with migration from the legacy client controls.

## Patch changes in 0.1.1

- The portrait picker surface now inherits the native Foundry theme background and uses a separate opacity paint layer.
- Only one thumbnail size slider is visible by default; independent width and height sliders appear in the per-user configuration menu when toggled.
- Live gallery sizing does not refetch images or reset search. Previous customized client-scoped settings are migrated once.

## Patch changes in 0.1.2

- Restore Foundry v13 ApplicationV2 native floating-window positioning, previously overridden by the 0.1.1 theme styles.
- Keep the Foundry sidebar fixed when the picker or Help window opens, moves, or closes.
- Clamp restored window positions and dimensions against the available viewport, including historical 0.1.1 data.
- Add CSS positioning contract tests and browser viewport/sidebar/stacking tests.
