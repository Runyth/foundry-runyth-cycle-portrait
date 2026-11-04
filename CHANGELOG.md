# Changelog

## 0.1.3 — 2026-11-04

- The installable archive now ships every relative import the manifest entry needs, so the module's buttons and settings register on world load instead of silently failing.

## 0.1.2 — 2026-11-01

- First publication as a Runyth module from the Runyth workspace (the id, title, npm package, and repository identity were already in place).

- Joined the workspace publication standard: deterministic installable `-mod`, source `-src`, and documentation `-doc` archives with per-version SHA256 checksums, byte-identical rebuild verification, publication scanning, and the standard quality and release pipelines on Node 24.
- Every program source carries the standard two-line AGPL source notice naming the holder; the manifest licence field points at the `LICENSE` file; the README carries the standard licence chapter and the release asset set; the interim packaging script moved into the standard toolchain.
- The auxiliary notice file was removed; the manifest now carries the repository, manifest, download, readme, and changelog URL surfaces.

- Fix a severe regression introduced in 0.1.1: the gallery and Help window overrode Foundry ApplicationV2's absolute window positioning with `position: relative`, causing an in-flow panel that displaced the right sidebar and prevented normal dragging.
- Leave floating-window positioning, drag behavior, and z-index to Foundry's native application framework; retain themed backgrounds and independent backdrop opacity.
- Clamp remembered window geometry to the full visible viewport when restoring previously saved coordinates, including those recorded during the broken release.
- Add an automated browser regression for sidebar stability, independent window movement and window stacking, plus unit tests for safe geometry restoration.

## 0.1.1 — 2026-11-01

- Use Foundry v13's active window theme instead of a fixed grey gallery background.
- Keep the opacity setting, including a fully transparent backdrop at 0%, without fading portraits and controls.
- Replace the three visible thumbnail-size settings with a dedicated per-user sizing submenu: one 225 px linked slider by default, or separate width and height sliders when enabled.
- Update open galleries in place when sizing changes; avoid unnecessary file browsing or gallery rerenders.
- Migrate customized 0.1.0 client-scoped thumbnail dimensions into the new user-scoped settings, preserving linked/independent selections.

## 0.1.0 — 2026-11-01

- Reset release numbering to `0.1.0` and change the module license to `AGPL-3.0-or-later`.
- Set the frame emoji 🖼️ as the default HUD control, adding emoji, Font Awesome, and original SVG alternatives.
- Keep the Portrait HUD control visually below Cycle Token via module identity and a scoped observer, including reversed columns.
- Remove “(personal)” and “(persönlich)” settings labels; settings remain client-scoped.
- Keep transparent thumbnail pixels transparent, remove all selection marks/footers, and show optional filename captions only.
- Increase default thumbnail width/height to 225 px.
- Preserve independent portrait service, Actor patterns, accessibility and authorization.
