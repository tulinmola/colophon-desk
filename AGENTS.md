# Colophon Desk — agent instructions

The desk is where a machine is seen whole: the computer and its monitor standing on a desk, drawn in three dimensions and running. The machine lives in `colophon-emulator` and the debugger that reads it in `colophon-player`, both under their own instructions; read those before touching anything that crosses into either. `README.md` is the prologue.

## The rule everything follows from

The desk honours the real machine. Every figure it is built from says where it came from, cited where it is used: measured here on a real unit [M], Amstrad's or a maker's own document [A], a museum record or a period review [B], a community reference [C], a community measurement or a part made to fit the machine [D], or derived here from photographs or arithmetic, with the derivation [E]. Where they disagree, the measurement taken on a real unit stands, and the disagreement is kept beside it.

A model someone else made is a cross-check, never a part: nothing here is copied from one. The research behind the figures is kept outside this repository; its downloads are other people's — manuals, photographs, firmware — and none of them is ever committed here.

## The machine

- Each model — a computer, a monitor, a cassette unit, a drive — is built by a file of its own in `tools/models/`, as it is made: solids cut and filleted by a CAD kernel, in the terms of its own parts, from named constants cited where they stand. A better measurement changes a number and not the code. Nothing is shared between models until two of them really share it. Geometry holds what a reader would see to be wrong — the silhouette, the key grid, the openings, the glass — and everything smaller is texture.
- `npm run models:build` writes each model to `src/assets/models/` as glTF — in metres, y up, the front toward +z — and the page only loads it. The file is committed with the change that made it and never edited by hand. A printed part carries its own vector artwork, which the builder renders to `src/assets/textures/<language>/` as PNG in TeX Gyre Heros from `tools/fonts/`, under the GUST Font License beside them; the page lays each print on the part that names it. The keycaps name one print of all their legends, each key carrying its rectangle of it in `_LEGEND`, and the page inks it over the plastic with a node material written in TSL for `WebGPURenderer`. A picture a machine drew is captured with the emulator's own command line, kept under `src/assets/screens/<language>/`, and cited where it is used with the machine, the ROM image's part and hash, and the command that took it; no ROM image belongs here. The page lays it on any part whose node says `screen`, so a monitor never knows which machine feeds it. Whatever changes while the machine runs — a key going down, a legend, the picture on the glass — belongs to the page, which finds the parts by their names and a key by the number it carries, `_KEY`, its number in the firmware's key matrix.
- When the desk runs a machine, it is compiled here by Emscripten from a checkout of the emulator standing beside this one, with a host of the desk's own, as `colophon-archive` does it. A host function is added the day the desk needs it and not before.
- One clock drives everything: `renderer.setAnimationLoop`. Each frame the machine runs the cycles it is owed since the last, capped, on to the next retrace so the picture is whole, and only then is the picture laid on the glass and the scene drawn. A key's release waits until a frame has been presented, or the firmware never sees the keystroke. Both rules are the player's own, in its `src/js/emulator/machine.js`, and are kept as the player keeps them.

## Naming

- The machine's names are its own: what the service manuals, the datasheets and the Compendium call a part, a chip or a socket is what it is called here.
- Wrappers around the WASM module mirror the C API mechanically, in the host language's case: `cpc_tick` becomes `tick`. A wrapper that renames what it wraps hides the emulator from anyone reading both.
- Ours are named for what they extend and what they do, not for the platform's plumbing, as the player's `Element` extends `HTMLElement` and runs `init` where `connectedCallback` fires.

## Code style

- Prettier decides formatting and is never a discussion: `npm run prettier:write`, and `npm run prettier:check` to verify. ESLint decides the rest: `npm run lint`.
- An `if` takes a name or one call, never a built-up expression. Hoist the expression to a boolean above it, named for what is true rather than for how it was decided.
- Never pass a call's result straight into another call, `super(...)` included; hoist it to a named `const`. When several `const` values are tightly coupled, group them in one declaration with commas.
- Never hide a real error in a guard. Check only what can legitimately vary at runtime.
- Private fields and methods (`#`) for internal state and helpers; `on*` handlers stay public when they are called from outside.
- Prefer `function` over arrows, except for a short one-line expression. Names say what a thing holds; no cryptic abbreviations.
- Prefer `==`, and `===` only where strictly needed. `for...of` for plain iteration; an indexed `for` when index arithmetic, several cursors, in-loop mutation control or coupled temporal variables are wanted; never `.forEach`.
- One export a file, and a named one; a folder's `index.js` alone may name several. It is the folder's surface, for outsiders: files inside import their siblings directly, because reaching a sibling through the index closes a cycle and `extends` is evaluated too early to survive one. No `.js` extension in the page's own imports, which Vite resolves; the tools, which Node runs, write theirs, and a package's subpath keeps whatever its exports map demands, as `three/addons/…` does.
- A comment is a battle the code lost, in stylesheets as much as in JavaScript, and the fix is never the comment. A name that does not say what the thing is: rename it. A hack: stop hacking. A diary entry nobody wants on Thursday: delete it. A claim about the code: it is a lie already or will become one. What survives is a fact no name can carry — an upstream constraint, a clause of a spec — in a line or two.
- What the code does, why an approach was chosen and what a decision cost belong in the commit message, not the code; a stylesheet is not annotated rule by rule.
- A source is cited where it is used: the link, and what was taken from it. Provenance is the one thing a name cannot carry.
- Plain CSS: custom properties, nesting, `light-dark()`.

## Simplicity and ownership

- Structure follows need: build nothing for a consumer that does not exist, and bring in a tool with the first thing that uses it.
- Elements handle the page and its events. Loading, fetching, the WASM module and the geometry belong to modules of their own.
- APIs are the desk's own, in the machine's terms; no generic abstractions for app-specific work.
- Of two options that work, the one with fewer concepts and fewer lines. Change what the task needs and no more; a rewrite that was asked for is a clean one rather than a patch. Finish with a pass that removes redundant checks, temporary indirections and duplicated logic.

## Voice

- A scribe's register: plain, declarative, a little antique. Take the metaphor seriously and never wink at it.
- Mood at the openings, discipline in the middles.
- Humour only as a byproduct of honesty. None in code comments or error messages: comments pay rent in facts, and error messages are read on bad days.
- Prose earns its place. Minimum, load-bearing only.
- One paragraph, one line. Markdown is never hard-wrapped.
- Write for 2036.

## Working

- `README.md` holds what the code cannot: what the desk is for and how it is built. It never describes a model or how far one has been drawn; the model's own file shows that, and a second account only goes stale.
- A test proves what the code does, never what it says: a test that repeats a model's figures or its placement proves nothing, and a model is checked by looking at it. Tests arrive in the change that writes the code they prove.
- `npm run check` before handing work back. `npm run test:e2e` drives the page in a browser with Playwright; run it too when the change reaches the page.
- Never commit, never push. The human reviews; the human commits.

## Unsettled

How the desk is distributed. How the textures are made for each country.
