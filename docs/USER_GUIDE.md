# Runyth Cycle Portrait — User guide

## Quick start

Select a token associated with an Actor. Open its Token HUD and choose the 🖼️ portrait button. The gallery shows available portraits. Select any thumbnail to update the source Actor's portrait immediately. Existing token art is unaffected.

When the gallery has no custom source configured, its initial listing comes from the current Actor portrait's folder. If images are stored elsewhere or a folder contains unrelated artwork, assign a more precise Actor portrait pattern.

## Configure a portrait source

1. Open the Actor's **Prototype Token → Appearance** section and locate **Actor portrait image path or wildcard**. This control is separate from Foundry's token image settings.
2. Enter an image path or a wildcard, for example `portraits/hero/Head_*.webp`.
3. Select **Save**. The gallery will now read matching portrait files.
4. Use **Clear** to restore automatic directory selection.

If the Prototype Token UI layout does not show the optional field, enable **Use advanced gallery** in module settings and use the **Actor portrait source** control at the bottom of the gallery. Both interfaces save the same Actor flag.

Nothing is changed when the pattern is saved except the source pattern itself. No image is selected automatically.

## Search and navigate

The search field uses case-insensitive filename substring matching. Tap the **✱** toggle to switch to regex matching; the icon stays highlighted while regex is enabled. The preference is saved separately for each user. Example: `^Head_.*\\.webp$` selects WEBP portraits beginning with `Head_`. Invalid/expensive expressions display an error and never change portraits.

The optional advanced layout adds previous/next portrait actions, Refresh, Help, and the Actor portrait source editor. The simple gallery shows only search and image thumbnails. The selected portrait uses a border, not a checkmark or an extra footer. Transparent image pixels remain truly transparent: no checkerboard is drawn. Filenames appear below thumbnails only when captions are enabled.

## Personal display preferences

| Setting | Default | Effect |
|---|---:|---|
| Advanced gallery | Off | Additional navigation and editing controls |
| Thumbnail dimensions | 225 px | One linked slider by default, from 85–245 px |
| Separate width/height | Off | Toggle within the dimensions submenu to enable two sliders |
| Captions | Off | Filename below the image |
| Tooltips | On | Filename on hover |
| Regex mode | Off | Remembered across gallery sessions |
| Window opacity | 100% | 0% removes only window backdrops, not thumbnails or controls |

The HUD icon is configurable per player using emoji, Font Awesome icons or three original SVG symbols. When Runyth Cycle Token is active, the Portrait icon is automatically placed immediately below its button, even if that button appears after the Portrait control or the HUD column uses reverse flex layout.

You can resize and move the gallery and Help windows. Their geometry is saved independently in this browser. The Help window contains a control to reset saved geometry.

## Permissions

A GM can change any source Actor portrait. A player must have ownership of both the token and the Actor, and the **Allow owning players** world setting must be enabled. Only Foundry's own document update permissions are used; the module does not perform privileged edits for a different user.

## Troubleshooting

| Symptom | Check |
|---|---|
| HUD selector missing | Confirm the module is enabled, the HUD setting is on, and token/Actor permissions allow editing |
| No images displayed | Confirm the configured wildcard matches files readable through Foundry's FilePicker; prefer one directory per source |
| A custom wildcard shows only one image | Check that the source contains `*`, `?` or brace alternatives and that extension/case match |
| Portrait changes but token image does not | Expected: this module updates Actor portrait only |
| Advanced controls missing | Enable the personal Advanced gallery setting |
| Images do not fill tile | Expected: `object-fit: contain` prevents image distortion |
| Window is visually transparent | Increase your personal Window opacity setting above 0% |
| Update rejected | Verify Actor and token ownership, the world's player permission toggle, and valid file paths |
| Error while reading images | Check Foundry storage access and server/browser logs |

## Thumbnail sizing (v0.1.1)

Open Module Settings → **Runyth Cycle Portrait** → **Thumbnail dimensions** → **Configure thumbnail sizes**. By default there is one 225 px slider for both axes. To change the image viewport width and height independently, enable **Use separate width and height sliders**. Preview updates immediately without reloading images. Image aspect ratios remain intact (`object-fit: contain`). These preferences are stored per user in the world, and previous customized values are migrated automatically.

The gallery window uses the active Foundry window background (including module themes that define the `--background` variable). The separate opacity slider adjusts the backdrop only, preserving portrait and text opacity even at 0%.
