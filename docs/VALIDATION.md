# Verification and acceptance checks

## Automated verification

From the source checkout:

```sh
npm run check
npm test
```

Tests use only the built-in Node.js runner and validate independent source loading, localization registration, permission checks, Actor update semantics, wildcard matching, cache behavior, and serialization. A successful Node run is not a substitute for live Foundry testing.

## Manual Foundry v13 acceptance

1. Install on a **copy** of a Foundry v13 world. Confirm enabling the module changes no existing portraits or token art.
2. Test a GM with a linked token, and again with an unlinked token. Confirm only the base Actor's portrait changes.
3. Test a player with Actor and token ownership; confirm they can select, while a player lacking either ownership cannot.
4. Disable the world player-permission option; confirm a player cannot change a portrait or pattern.
5. Test a default portrait folder with multiple PNG/WEBP images, an exact image, filename prefixes, and brace-based extension patterns.
6. Open the gallery in simple mode and switch to advanced mode in personal settings without changing another player's view.
7. Test literal and regex search; verify invalid patterns show errors and do not select artwork.
8. Verify thumbnails default to 225 px, then change thumbnail width and height; verify tile boundaries and image aspect ratios.
9. Set opacity to 0%, verifying transparent window backgrounds while thumbnails and UI remain fully opaque.
10. Resize/move the gallery and Help independently, close/reopen, and reset saved window geometry.
11. Verify the Prototype Token Appearance source setting appears in the appearance content on standard v13 layout; the advanced gallery editor is the supported alternate interface.
12. Reload the world, disable the module, and confirm all selected Actor portraits remain ordinary Foundry images with no UI dependency.

## Expected result

A successful manual pass confirms compatibility with the target Foundry world and active UI modules. Until then, behavior within the actual Foundry client should be considered unverified.

## 0.1.0 acceptance additions

13. Confirm the frame emoji is the default in a newly configured client. Switch among emoji, Font Awesome, and original SVG alternatives without reloading the world. Confirm that old preconfigured icon values remain supported.
14. Enable Cycle Token and Cycle Portrait, and verify the Portrait HUD button is directly below the Cycle Token button. Repeat with different icon choices, a late-inserted Cycle Token button, reversed HUD column styling, different tokens, and unrelated emote controls. Disable Cycle Token and verify the Portrait button still works independently.
15. Inspect transparent PNG or WEBP portraits: no checkerboard and no opaque tile image backing. With filename captions disabled, verify no footers or checkmarks appear, even for the current portrait. With captions enabled, only the filename caption appears.
16. Confirm settings no longer display “(personal)” or “(persönlich)” and that individual users still retain independent client settings.
17. Confirm AGPL-3.0-or-later in the manifest, package and documentation; check the source archive retains an actual valid Git repository.

`python3 tools/check-ui-browser.py` performs 16 HUD/transparency browser checks; `python3 tools/check-size-browser.py` performs 25 background/size behavior checks. These Chromium fixtures are not substitutes for live Foundry testing.

## 0.1.1 acceptance additions

18. Verify the picker backdrop matches the current Foundry theme when opacity is 100%; switch to an alternate supported theme and repeat. With opacity 0%, verify that the background and chrome are transparent but icons, controls, filenames and image pixels are fully opaque.
19. In module settings, verify that the sizing entry opens one slider labeled Width and height, default 225 px. Enable separate sizing and verify that only the independent width and height sliders appear. Toggle back and forth, verifying separate values are remembered.
20. Keep an image picker open while moving any slider. Confirm tiles change size immediately, without a refresh, scroll reset, Actor writes, or image refetch.
21. Upgrade a customized 0.1.0 client with linked settings, then a client with independent sizes. Confirm previous dimensions survive in the correct new mode and other world users retain independent preferences.

## 0.1.2 window-layout regression acceptance

22. In Foundry v13 with the right sidebar open, launch the gallery from a Token HUD control. The sidebar must not move, resize, or overlap the gallery due to reflow. Move the gallery to the far left and then across the sidebar; movement must be unconstrained by sidebar boundaries.
23. Bring the picker in front of a sheet and the Help window, and bring the other application back in front. Verify regular window focus/drag interactions; the picker must not create a separate stacking layer beneath the sidebar.
24. Close and reopen after moving/resizing the window, including after an upgrade from v0.1.1. A previously off-screen saved location should be clamped to the visible viewport. Repeat with a smaller browser viewport and with the Help window.
25. Repeat theme and opacity checks from v0.1.1 to confirm removal of the root positioning override did not break backdrop painting, transparency, icon visibility or thumbnail sizing.

`python3 tools/check-window-browser.py` performs 11 new browser assertions against a Foundry-like sidebar and floating-window layout. It guards the root positioning contract, stable sidebar geometry, window movement, overlapping windows and z-index. This fixture does not replace in-client testing with the actual Foundry UI.
