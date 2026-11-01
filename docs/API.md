# Public module API

Once Foundry emits the `ready` hook, the API is exposed as `game.modules.get('runyth-cycle-portrait').api`.

| Method | Result |
|---|---|
| `open(actor, token = null)` | Open an Actor's portrait gallery (the token establishes player authority when selecting) |
| `images(actor, {refresh = false, token = null} = {})` | Promise of authorized candidate paths |
| `choose(actor, image, {token = null} = {})` | Promise of boolean; updates `Actor.img` only if different |
| `setPattern(actor, pattern, {token = null} = {})` | Promise of saved string; empty clears pattern |
| `help()` | Open the Help application |

Non-GM integrations calling `choose` must supply a live token belonging to the user. All permissions are rechecked by the underlying service, including the world ownership toggle.

On successful image changes, `Hooks.callAll('runythCyclePortraitChanged', {actor, token, previous, image})` fires. A no-op selection does not emit the hook.

An integration example, using Foundry's JavaScript client API:

```js
// Display an Actor's portraits without modifying any images automatically.
const api = game.modules.get('runyth-cycle-portrait')?.api;
const token = canvas.tokens.controlled[0];
if (api && token) {
  api.open(game.actors.get(token.document.actorId) ?? token.actor, token);
}
```

Source code uses 2-space indentation, ES modules, asynchronous operations, and explicit validation.
