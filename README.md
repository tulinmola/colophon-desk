# Colophon Desk

## Prologue

A catalogue can say that a manuscript measures so many centimetres and weighs so much, and it stays a line in a ledger until someone lays the book on the desk and opens it. The machines of the 8-bit era are catalogued the same way: a size in a service manual, a photograph in a museum's record.

The [emulator](https://github.com/tulinmola/colophon-emulator) runs them from the inside, and the [player](https://github.com/tulinmola/colophon-player) is where they are read. Here the machine is seen whole: the computer and its monitor standing on a desk, the picture on the glass, the keys going down under the fingers that press them. Every measure it is built from is taken from the machine itself or from a source that can be named, and says which.

## Building

Node and npm build the site and check it. Compiling the machine it runs wants Emscripten as well, and a checkout of [the emulator](https://github.com/tulinmola/colophon-emulator) standing beside this one.

```sh
npm install
npm start              # serve the page
npm run build          # write the site to dist/
npm run models:build   # write the models and their prints to src/assets/
npm run emulator:build # compile the machine and this host into src/js/vendor/
npm run check          # formatting and linting
```

The built module is named for the emulator commit it came from and a digest of `emulator/`, so a change to either gives it a new name: `src/js/emulator/module.js` follows that name, and the superseded build is deleted rather than left to be picked up by mistake.

No firmware is kept here and none is served from here. The page fetches the images itself, pinned by hash and verified in the browser before the machine is booted, and keeps them in the reader's own storage — so a reader obtains their own copy, from the sources named below, exactly as anyone running the emulator's fetch script does. No software is kept here either: a disc goes into the drive from the reader's own files.

## Weighing the tube

```sh
npm run browsers # Chromium for Playwright to drive, once
npm run test:e2e # the page driven in a browser
npm run perf     # the generated fragment shader, against its recorded cost
```

`npm run test:e2e` stands a machine up, so it fetches firmware from the sources below and needs the network; `npm run perf` does not.

`npm run perf` compares the fragment shader the screen material compiles to — statements, operators, texture fetches and the calls that cost — against `perf/shader.spec.js-snapshots/`; `--update-snapshots` records a new cost. It counts what the shader asks for, not what a GPU charges for it.

## Publishing

Pushing to `main` checks the site, builds it and publishes it to GitHub Pages at [desk.colophon-project.com](https://desk.colophon-project.com/).

The models, their prints and the machine's module go out as they were committed: the workflow runs neither `npm run models:build` nor `npm run emulator:build`.

## Sources

Every figure is cited at the line that uses it. This is the other view: what the desk stands on, and what each source gives it.

**The machine.**

- [CPC6128 Service Manual](https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a) — Amstrad's own dimensions and technical specifications, and the mouldings by part number.
- [SOFT 968](https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual) — the firmware manual, each key's number in the matrix, and the DATA format a blank disc is laid out in.
- [Reading the keyboard and Joysticks](https://cpctech.cpcwiki.de/docs/keyboard.html) — which line and bit each key sits on, and so where a browser's own keys reach the machine.
- [Disk image file format](https://cpctech.cpcwiki.de/docs/dsk.html) — the layout of a disc image, which the tests write to give the drive discs of their own.
- [CP/M 2.2 disc formats](https://www.seasip.info/Cpm/format22.html) — a directory entry, and the &E5 that marks one holding no file.
- [CTM644 amendment service manual](https://retronik.silicium.org/DOCUMENTS/Info/Amstrad_CPC/Amstrad%20CPC464%206128%20GT65%20CTM644%20MP3%20CT1%20amendment%20service%20manual.pdf) — the monitor's cabinet mouldings, by part number.
- [oldcrap.org](https://oldcrap.org) — photographs of a 2020 CTM644, rectified here to measure from.
- [amstrad.eu](https://www.amstrad.eu) — the monitor seen three-quarters on, where no square view reaches.
- [Retro Ordenadores Orty](https://retroordenadoresorty.blogspot.com/2021/08/amstrad-cpc-6128-128k-ordenador.html) and [its Amstrad pages](https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html) — square-on photographs of two Spanish 6128s, and the colours of an unfaded badge.
- [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Amstrad_CPC6128), [one machine](https://commons.wikimedia.org/wiki/File:AMSTRAD_CPC_6128.jpg) and [another](https://commons.wikimedia.org/wiki/File:Amstrad_CPC_6128_solo_macchina.jpg) — the drive bezel rectified, and the plastic's hue on aged cabinets.
- [sasfepu78](http://sasfepu78.fr/articles/Amstrad/) — a 600 dpi scan of a French 6128's keys, lying face down.
- [Retroleum](https://retroleum.co.uk/cpc-kb) — keycap heights for the later 464, which bound the 6128's.
- [Panasonic EME-150](https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf) — the drawing of the drive's sister, its length, the slot across it, and the IN USE lamp on its bezel.
- [Hitachi HFD305SX](https://archive.org/details/hitachi-compact-floppy-disk-drive-model-hfd-305-sx) — another 3-inch drive's manual, and the one drawing of the disc itself: its outline, which the slot must pass, and its hub's hole.
- Parts printed to fit: a [monitor stand](https://www.printables.com/model/527817), a [key cover](https://www.printables.com/model/1334008) and two drive plugs ([one](https://www.thingiverse.com/thing:2876318), [two](https://www.printables.com/model/284516)) — they measure the openings they fill.

**The disc.**

- [CPC6128 user instructions](https://archive.org/details/amstrad-cpc-6128-user-manual) — Amstrad's own names for the disc and its parts, the write-protect shutter at its corner, and the drive's indicator lamp with what lights it.
- [fileformat.info](https://www.fileformat.info/media/compact-floppy/index.htm) — a flatbed scan of an Amsoft blank beside a ruler, on which every opening and the label's second side are measured.
- Wikimedia Commons, [a museum's discs](https://commons.wikimedia.org/wiki/File:79_DISQUETES.jpg) and [an Amsoft blank](https://commons.wikimedia.org/wiki/File:AMSoft_Compact_Floppy_Disc_20071208.jpg) — the plastic's and the label's colours, the strip round the label end, and the label's first side.

**The firmware.**

- [Amstrad's permission](https://worldofspectrum.net/app/themes/wosc-classic/static/legacy/amstrad-roms.txt) — Cliff Lawson's 1999 answer, under which these images are fetched, and which the emulator's own `tools/fetch-roms.sh` records in full along with what it does not reach.
- [Arnold](https://github.com/rofl0r/arnold) — the two halves of the Spanish 6128's firmware, Amstrad part 40038, which the page joins and checks against its pin.
- [Caprice32](https://github.com/ColinPitrat/caprice32) — Amstrad's AMSDOS image, the ROM the disc interface brings, whose own format table gives the filler byte the tests' discs are formatted with.

**The glass.**

- [cpc.sylvestre.org](http://cpc.sylvestre.org/technique/technique_gfx8.html) — macro photographs of the CTM644's segmented colour columns.
- [AAPM TG18](https://www.aapm.org/pubs/reports/OR_03.pdf) — spot size and video bandwidth as a spatial spread.
- [pbrt, _Texture Sampling and Antialiasing_](https://pbr-book.org/4ed/Textures_and_Materials/Texture_Sampling_and_Antialiasing) — why a box average over a pixel still aliases.
- [CRT-Royale](https://docs.libretro.com/shader/crt_royale/#preset-versions) and [its account of bloom](https://docs.libretro.com/shader/crt_royale/#is-this-phosphor-bloom-realistic) — the cheaper glow the phosphors follow.

**The drawing.**

- glTF 2.0, [its units](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units) and [its images](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images) — metres with y up and the front toward +z, and a texture's first row at the top.
- [EXT_mesh_gpu_instancing](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing) — how an instance carries its turn.
- [three.js `TextureNode.grad`](https://threejs.org/docs/pages/TextureNode.html#grad) — why snapped rows need unsnapped gradients.

## License

MIT, like the rest of Colophon. The fonts in `tools/fonts/` are TeX Gyre Heros 2.004 by Bogusław Jackowski and Janusz M. Nowacki, its Vietnamese characters by Hàn Thế Thành, shipped unmodified under the GUST Font License; that licence, the family's manifest and its readme stand beside them. They are the builder's, not the page's: the prints are rendered from them, and nothing of them reaches the browser. The font in `src/assets/fonts/` is the page's own, and does reach it: Patrick Hand 1.003 by Patrick Wagesreiter, shipped unmodified under the SIL Open Font License 1.1, whose text stands beside it, and it is served to the reader's browser rather than used only in the build.
