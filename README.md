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

`npm run perf` compares the fragment shader the colour tube's screen material compiles to — statements, operators, texture fetches and the calls that cost — against `perf/shader.spec.js-snapshots/`; `--update-snapshots` records a new cost. It counts what the shader asks for, not what a GPU charges for it.

## Publishing

Pushing to `main` checks the site, builds it and publishes it to GitHub Pages at [desk.colophon-project.com](https://desk.colophon-project.com/).

The models, their prints and the machine's module go out as they were committed: the workflow runs neither `npm run models:build` nor `npm run emulator:build`.

## Sources

Every figure is cited at the line that uses it. This is the other view: what the desk stands on, and what each source gives it.

**The machine.**

- [CPC6128 Service Manual](https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a) — Amstrad's own dimensions and technical specifications, and the mouldings by part number.
- [CPC464 Service Manual](https://archive.org/details/Amstrad_CPC464_Service_Manual_1985_Amstrad_Consumer_Electronics) — the 464's overall size, the datacorder's keys by name and part number, their locking plates, the cassette compartment's floor and the lid's pivot hooks.
- [CPC464, CTM640 and GT64 Service Manual](https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual) — the GT64's mouldings and fittings by part number, its overall size, its tube, the board whose pots set its thumbwheels' pitch, and the resistors that mix the 464's colours into LUM.
- [CPC6128, CTM644 and GT65 Service Manual](https://archive.org/details/amstrad-cpc-6128-micro-computer-ctm-644-color-monitor-gt-65-green-monitor-service-manual) — the GT65's front moulding, and the rear it shares with the GT64.
- [SOFT 968](https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual) — the firmware manual, each key's number in the matrix, the DATA format a blank disc is laid out in, the bit that turns the datacorder's motor, and how the firmware writes a tape, which the tests write one by.
- [CPC464 user instructions](https://archive.org/details/cpc464.en) — what each of the datacorder's keys does, how a cassette goes into its lid and how a tape is loaded; the order of the greys a green monitor shows the colours in, and the start-up screen as it shows it, which sets its brightness a little above black.
- [Reading the keyboard and Joysticks](https://cpctech.cpcwiki.de/docs/keyboard.html) — which line and bit each key sits on, and so where a browser's own keys reach the machine.
- ["Sinclair ZX Specifications" (Martin Korth)](https://www.problemkaputt.de/zxdocs.htm) — where each key sits on the Spectrum's matrix, and so where a browser's own keys reach it.
- [Disk image file format](https://cpctech.cpcwiki.de/docs/dsk.html) — the layout of a disc image, which the tests write to give the drive discs of their own.
- [CP/M 2.2 disc formats](https://www.seasip.info/Cpm/format22.html) — a directory entry, and the &E5 that marks one holding no file.
- [CTM644 amendment service manual](https://retronik.silicium.org/DOCUMENTS/Info/Amstrad_CPC/Amstrad%20CPC464%206128%20GT65%20CTM644%20MP3%20CT1%20amendment%20service%20manual.pdf) — the monitor's cabinet mouldings, by part number, and the later 464 board that places its rear's edge connectors.
- [oldcrap.org](https://oldcrap.org) — photographs of a 2020 CTM644, rectified here to measure from, and [a Schneider GT65](https://oldcrap.org/2018/11/04/amstrad-schneider-gt-65-monitor/) from the front, the side and behind, opened, and running.
- [amstrad.eu](https://www.amstrad.eu) — the monitor seen three-quarters on, where no square view reaches, and Amstrad's 1984 adverts, which [name the GT64](https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Pubs/CPC/CPC464_Au_premier_coup_d_oeil.pdf) and [photograph its face square-on](https://amstrad.eu/wp-content/uploads/ftp_cpcscene/Pubs/CPC/CPC464_Un_ordinateur_complet.pdf).
- [The Living Computer Museum's GT65](<https://commons.wikimedia.org/wiki/File:CPC464(2).jpg>) on Wikimedia Commons — an English unit's face, rectified beside the GT64's, and [a Spanish unit](<https://commons.wikimedia.org/wiki/File:Amstrad_CPC_464_(1984)_1.jpg>) lettered in Spanish.
- [The UPV's museum](https://ceres.mcu.es/pages/Main?idt=121856&inventary=CE2017/007/005&table=FMUS&museum=MUPV) — a museum's measure of a GT65 of the GT64's generation, narrower than Amstrad's own.
- Kleinanzeigen listings of Schneider GT64s, [one seen from behind](https://www.kleinanzeigen.de/s-anzeige/schneider-cpc-464-original-gt64-gruenmonitor-gereinigt-gepruef/3538996032-228-2054) and [one running](https://www.kleinanzeigen.de/s-anzeige/schneider-cpc464-mit-gruenmonitor/3557591301-228-9501) — the rear face's width and where the picture stands on the glass.
- [Retro Ordenadores Orty](https://retroordenadoresorty.blogspot.com/2021/08/amstrad-cpc-6128-128k-ordenador.html) and [its Amstrad pages](https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html) — square-on photographs of two Spanish 6128s, the colours of an unfaded badge, and the late 464 ends its profile is traced from.
- [The BnF's Charles Cros collection](<https://commons.wikimedia.org/wiki/Category:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n>) — public-domain studio photographs of a late 464 from above, behind and below, rectified here, its colours, and its datacorder shut, open and loaded from one tripod, through which the lid's hinge and swing and a seated cassette's place are worked out; and of a GT65 whose lower panel places the controls' height.
- Wikimedia Commons, the Musée Bolo's 464 [from above](https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7169.jpg), [in front](https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7170.jpg) and [behind](https://commons.wikimedia.org/wiki/File:Amstrad_CPC464-IMG_7198.jpg), and a Spanish 464's keys [whole](https://commons.wikimedia.org/wiki/File:Amstrad_CPC464_keyboard.jpg) and [close](https://commons.wikimedia.org/wiki/File:Amstrad_CPC_keyboard_closeup.jpg) — the legends' sizes, the caps' height, the bottom cabinet's inclined ends, and the Spanish legends and badge.
- [vecchicomputer](https://www.vecchicomputer.com/2025/02/amstrad-schneider-cpc-464-1984/) — long-lens views of a 464's ends, which correct the close ones for the camera's tilt.
- Museum records of the 464, [the Science Museum's](https://collection.sciencemuseumgroup.org.uk/objects/co8413235/amstrad-cpc-464-computer-with-cassette-drive), the BnF's [no. 1016](https://archivesetmanuscrits.bnf.fr/ark:/12148/cc97705f/ca19918160) and [no. 1183](https://archivesetmanuscrits.bnf.fr/ark:/12148/cc97705f/ca19919170), [the Computer History Museum's](https://www.computerhistory.org/collections/catalog/102673165) and [the UPM's](https://blogs.upm.es/museotelecomunicaciones/ordenador-domestico-amstrad-cpc-464/) — real units measured, the width they agree on, against which Amstrad's own reads wide; and [the UPV's](http://ceres.mcu.es/pages/Main?idt=121782&inventary=CE2017/009/009&table=FMUS&museum=MUPV) and [the Technisches Museum Wien's](https://data.tmw.at/object/190299), to the half centimetre, a little wider.
- [The V&A's 464](https://collections.vam.ac.uk/item/O1172044/) — a museum's measure of a real unit, narrower than the others.
- CPCWiki on the [CPC 464](https://www.cpcwiki.eu/index.php/CPC_464) and the [CPC 472](https://www.cpcwiki.eu/index.php/CPC_472) — a plainer Spanish badge, the Spanish words on the datacorder's inlay, and the Spanish 464 firmware's part number.
- [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Amstrad_CPC6128), [one machine](https://commons.wikimedia.org/wiki/File:AMSTRAD_CPC_6128.jpg) and [another](https://commons.wikimedia.org/wiki/File:Amstrad_CPC_6128_solo_macchina.jpg) — the drive bezel rectified, and the plastic's hue on aged cabinets.
- [sasfepu78](http://sasfepu78.fr/articles/Amstrad/) — a 600 dpi scan of a French 6128's keys, lying face down.
- [Retroleum](https://retroleum.co.uk/cpc-kb) — keycap heights for the later 464, which bound the 6128's.
- [Panasonic EME-150](https://www.cpcwiki.eu/index.php/File:Panasonic-3_inch_Floppy_Drive_EME-150.pdf) — the drawing of the drive's sister, its length, the slot across it, and the IN USE lamp on its bezel.
- [Hitachi HFD305SX](https://archive.org/details/hitachi-compact-floppy-disk-drive-model-hfd-305-sx) — another 3-inch drive's manual, and the one drawing of the disc itself: its outline, which the slot must pass, and its hub's hole.
- Parts printed to fit: a [monitor stand](https://www.printables.com/model/527817), a [key cover](https://www.printables.com/model/1334008) and two drive plugs ([one](https://www.thingiverse.com/thing:2876318), [two](https://www.printables.com/model/284516)) — they measure the openings they fill.
- Parts made to fit the 464: a [replacement keyboard](https://github.com/Bread80/CPC_Keyboards) on its 19.05 grid, a [keycap](https://www.thingiverse.com/thing:4596135), a [cassette lid's window](https://www.thingiverse.com/thing:4599630) and a [datacorder key](https://www.printables.com/model/284139) — the keys' places, a cap's shape, the lid's and the piano keys' sizes, and the rod a piano key's lever turns on.
- [Andrew Dorey's restoration of a 464](https://andrewdorey.com/post/amstrad-cpc-464-repair) — the piano keys' levers on their one rod, and the bare mechanism where the rod is seen.
- Two video frames, [PLAY held down](https://i.ytimg.com/vi/aC0WpCXMPno/maxresdefault.jpg) and [PLAY latched](https://i.ytimg.com/vi/Dv6iysaQK2I/maxresdefault.jpg) — how far a piano key turns, pressed and latched.
- [Planet Sinclair](https://rk.nvg.ntnu.no/sinclair/computers/zxspectrum/spec_technical.htm) — Sinclair's 1982 leaflet transcribed: the Spectrum's 233 × 144 × 30.
- [Personal Computer World, June 1982](https://www.tebbo.com/archive/pw8206.htm) — the same size, measured on a production prototype.
- [The Bibliothèque nationale's Spectrum](<https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Sinclair_-_ZX_Spectrum._Micro-ordinateur_Sinclair_ZX_Spectrum,_n%C2%B0_de_s%C3%A9rie_022-007502_-_btv1b55013033m_(05_of_43).jpg>) — public-domain studio photographs of one 48K from above, in front, behind and at its ends, the case and its openings measured from.
- Rick Dickinson's sketches, [specDEV01](https://www.flickr.com/photos/9574086@N02/697761930/), [specDEV05](https://www.flickr.com/photos/9574086@N02/697768028/), [specDEV07](https://www.flickr.com/photos/9574086@N02/696905353/) and [specKB03](https://www.flickr.com/photos/9574086@N02/697782712/) — the designer's 30 mm at the rear, key tops 14 × 10 at 20 mm centres, and the anodised printed template carried over the ends.
- [US design patent D277,484](https://patentimages.storage.googleapis.com/6b/3e/70/86c196895b83f5/USD277484.pdf) — Dickinson's drawings of the case: its side, where the cases part, the deck's rise and the step behind it.
- The Science Museum's [Spectrum](https://collection.sciencemuseumgroup.org.uk/objects/co8421531/sinclair-zx-spectrum-microcomputer-1982-1985) and [boxed Spectrum](https://collection.sciencemuseumgroup.org.uk/objects/co8192867/sinclair-zx-spectrum-computer-in-original-packaging), and [Museum Rotterdam's](http://museumrotterdam.nl/collectie/item/77523-1-14), and the UPV museum's [two](http://ceres.mcu.es/pages/Main?idt=121833&inventary=CE2017/020/003&table=FMUS&museum=MUPV) [records](http://ceres.mcu.es/pages/Main?idt=125153&inventary=CE2023/009/046&table=FMUS&museum=MUPV) — the heights museums record, which stand beside the drawn one.
- [The V&A's Spectrum](https://api.vam.ac.uk/v2/object/O1300970) — the keys as one mat, each through an opening of its own.
- [The Register, 2012](https://www.theregister.com/2012/04/23/retro_week_sinclair_zx_spectrum_at_30?page=2) — the raised rear section and rounded sides.
- [ZX Spectrum service manual](https://spectrumcomputing.co.uk/pub/sinclair/technical-docs/ZXSpectrum48K_ServiceManual.pdf) — the case's five screws, the keyboard template by name, the jacks and the keys' grey.
- The ZX Spectrum Introduction, [chapter one](https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_one.html) — the rear's sockets by name; and [chapter six](https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_six.html) — the recorder Sinclair asks for, a cheap portable mono one, naming none.
- [Issue 3B board recreation](https://github.com/liveboxandy/ZX-Spectrum-48K-Issue-3B---Based-on-Gerbers-by-PABB-on-PCBWay) — the board's place, its mounting holes, its jacks and its edge connector, which set the rear's openings; and [an Issue 4B's](https://github.com/iansbremner/ZX-Spectrum-Issue-4B-KiCAD), which differs from it.
- [A replacement case](https://www.printables.com/model/700687-replacement-zx-spectrum-48k-case-key-caps-for-mech), made to fit — 234 × 144, and the slot, the openings and the speaker's holes.
- [A keyboard overlay](https://www.printables.com/model/891085-zx-spectrum-keyboard-overlay-for-48k-rubber-key-mo), made to fit — the 20 mm grid and the keys' holes; and [a printable case](https://www.thingiverse.com/thing:1240780), the template's recess.
- [oldcomputer.info's membrane](https://oldcomputer.info/hacks/zxkeyb/index.htm), made to fit — the rows 20.00 apart.
- [Retroleum](https://www.retroleum.co.uk/spectrum-fittings), [sinclaircollection](https://www.sinclaircollection.site/?p=418) and [Dataserve](https://www.dataserve-retro.co.uk/contents/en-uk/p2433_Sinclair-ZX-Spectrum-16K-_-48K-Replacement-Case-Screws-_-Rubber-Feet.html) — the rubber feet's height, and the screws, black and countersunk.
- Wikimedia Commons, Nico Kaiser's Spectrum [from above](<https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_48k_(7160141482).jpg>) and [at an angle](<https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_48k_(7160143184).jpg>), [William Warby's](<https://commons.wikimedia.org/wiki/File:Sinclair_ZX_Spectrum_(16801824525)_(2).jpg>) and [a bare keymat](https://commons.wikimedia.org/wiki/File:ZX_Spectrum_showing_rubber_key_mat.jpg) — the key grid, every legend's place and ink, the rainbow, and the keys' height and colour.
- [Sinclair Wiki, Keyboard](https://sinclair.wiki.zxnet.co.uk/wiki/Keyboard) — the half-rows the upper address lines select, which number the keys.
- [Sony KV-1400E service manual](https://www.manualslib.com/manual/4267546/Sony-Trinitron-Kv-1400e.html?page=2), and [a second scan](https://www.manualslib.com/manual/3463898/Sony-Trinitron-Kv-1400e.html?page=2) — the television's size and weight, its tube, its mouldings in white, and its aerial socket.
- Radiomuseum, [Sony's 1979 catalogue](https://www.radiomuseum.org/images/radio/sony_tokyo/kv_1400_e_1719734.jpg), [its photograph of the set](https://www.radiomuseum.org/images/radio/sony_tokyo/kv_1400_e_388185.jpg), and a grey set [from above](https://www.radiomuseum.org/images/radio/sony_corporation/kv_1400_e_2590214.jpg) and [with its lid open](https://www.radiomuseum.org/images/radio/sony_corporation/kv_1400_e_2590216.jpg) — the face the front was read from, the size again, the handle, the ledge and its pads.
- [The Gadget Museum's white KV-1400](<http://www.gadgetmuseum.org.uk/det/1646/Sony-KV-1400-14-Trinitron-TV-(White-Cream)/>) and [its photograph](http://www.gadgetmuseum.org.uk/userdata/PRODPIC-1646.jpg) — a white UK set at three quarters: its side, its legends, its colours, and a collector's size.
- [Sinclair's 1982 Spectrum brochure](https://spectrumforeveryone.com/wp-content/uploads/2020/08/Spectrum-Brochure.pdf) — the white Trinitron Sinclair stood the Spectrum before.
- [service-data.com](https://www.service-data.com/section.php/16490/1/kv-1400ub) — the UK model's name, KV-1400UB.
- [Sony KV-1340E service manual](https://archive.org/details/kv-1340e) — a sibling's tube code beside its sold size, by which the 350LB22 reads as 35 cm.
- [MicroHobby 42](https://archive.org/download/microhobby-magazine-042.pdf/MicroHobby_042_djvu.txt) — a Spanish owner's "Spectrum 48 K y cassette COMPUTONE", one of the readers' adverts that make the Computone CRC-1001 the recorder beside the 48K.
- [Ian's Retro Museum's Computone](https://iansretromuseum.co.uk/cassettes/computone/gfx1/l08.jpg) — the recorder seen square from above, scaled on the hubs of the cassette in its window: every place on its top.
- [The YOKO CRC-1001](<https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/mini-k7-(P)Yoko-80s-CRC-1001_1.htm>) at antique-autoradio-madness.org — the same recorder under another badge, from its sides, open, from beneath and on its rating plate: the sockets, the handle, the cells it runs on and how far its lid opens.
- Pinterest, [a Spanish unit from above](https://i.pinimg.com/736x/f6/46/0e/f6460e4f5a36d718ca162a1ffd2d3a1a.jpg) and [another](https://i.pinimg.com/736x/27/ef/63/27ef63fef14db4472ca640062bf91487.jpg) — the recorder's height from its side's sockets, and a second scale for its top.
- [DIN connector](https://en.wikipedia.org/wiki/DIN_connector) on Wikipedia — the socket's pin circle and the plug's shield, the yardsticks the recorder's height is read by.
- [A gold Computone at maltapark](https://www.maltapark.com/asset/itemphotos/9628070/9628070_2.jpg?_ts=2) — the counter's wheels through their window.
- [Radiomuseum's Elta CRC 1001](https://www.radiomuseum.org/images/schematic-medium/elta_gmbh_rodermark/crc_1001_1915036.png) — the schematic of the same recorder under a German badge: its microphone and its sockets.
- [El Mundo del Spectrum](https://www.elmundodelspectrum.com/cuentanos-tu-primer-contacto-con-un-spectrum/) — owners' first Spectrums, among them the memory of a Computone's "ruedecitas Volume y Tone", where every photograph shows a VOLUME wheel alone.

**The tape.**

- [ECMA-34](https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf) — the compact cassette's dimensioned standard: its shell, its holes and openings, its hubs, whose pitch spaces the datacorder's spindles, and which way they turn.
- [JIS C 5568:1997](https://kikakurui.com/c5/C5568-1997-01.html) — IEC 94-7 in its faithful Japanese copy: the shell's thicknesses, its openings' heights and the hubs' teeth, and so how deep a seated cassette reaches.
- [Amsoft's Winter 1984/85 catalogue](https://archive.org/details/Amsoft_Software_And_Peripherals_Catalogue_Winter_1984-85_1984_Amstrad_Consumer_Electronics) — the CT-15, Amsoft's blank for recording programs, photographed loose, its hubs light.
- CPCWiki's scans of two Amsoft C15s, [one](https://oldwiki.cpcwiki.eu/imgs/f/f1/Amsoft_C15.jpg) and [another](https://oldwiki.cpcwiki.eu/imgs/e/e3/C15_Tape.jpg) — rectified here: the label's layout and colours, the window and what shows through it, and the screws.
- [Sound-on-Sound's advert in MicroHobby 11](https://archive.org/download/microhobby-magazine-011.pdf/page/n34_w1600.jpg) — Iberofón's blank for the Spanish Spectrum owner, its C-10 photographed whole and its C-15 in its case: rectified here, the label's layout, its lettering and colours.
- [Philips Technical Review 31 (1970)](https://www.musicaememoria.com/docs/PTechReview-31-1970-077.pdf) — the cassette's speed and its tapes' thicknesses, from which the reels are wound.
- [The Sony TC-U30's manual](https://www.manualslib.com/manual/3312455/Sony-Tc-U30.html?page=12) — a deck of the time's winding speed, which stands in for the datacorder's own and the recorder's.
- [CPC-Power's tapes that ask for a counter number](https://www.cpc-power.com/index.php?page=protection&lenom=COMPTEUR%20CASSETTE) — Loriciels' Pharaon's counter numbers for its own blocks, to which the counter's gearing is fitted.
- [archive.org's collection of CPC tapes](https://archive.org/details/amstrad-cpc-cdt-collection) — the largest image among thousands, which sizes the room a tape is given.
- [The TZX format](https://worldofspectrum.net/TZXformat.html) — the image a .cdt is, in which the tests write a tape of their own, and the stop a Spectrum's tape marks between its parts.
- [ZXDB](https://github.com/zxdb/ZXDB) — the catalogue of the Spectrum's tapes, from which a sample drawn at random sizes the room a 48K's tape is given.
- SkoolKid's disassembly of the 48K's ROM, [SA-BYTES](https://skoolkid.github.io/rom/asm/04C2.html) and [SAVE-ETC](https://skoolkid.github.io/rom/asm/0605.html) — the blocks a 48K saves, their flag and parity, a program's header, and the border's colours while it loads, from which the tests write a tape of their own.
- The ZX Spectrum BASIC manual, [chapter 20](https://worldofspectrum.org/ZXBasicManual/zxmanchap20.html) — what LOAD "" loads, which the tests type; and [chapter 24](https://worldofspectrum.org/ZXBasicManual/zxmanchap24.html) — how a line of BASIC and the numbers in it are kept, for the program on the tests' tape.
- [Emulator file formats](https://worldofspectrum.org/faq/reference/formats.htm) — a .tap's blocks, each opening with its length.

**The disc.**

- [CPC6128 user instructions](https://archive.org/details/amstrad-cpc-6128-user-manual) — Amstrad's own names for the disc and its parts, the write-protect shutter at its corner, and the drive's indicator lamp with what lights it.
- [APPNOTE.TXT](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) — PKWARE's own specification of the .ZIP format, by which an archive of discs or tapes is opened without a library.
- [Code page 437](https://en.wikipedia.org/wiki/Code_page_437) — the letters a disc or a tape was named in before archives carried Unicode, which no browser decodes.
- [fileformat.info](https://www.fileformat.info/media/compact-floppy/index.htm) — a flatbed scan of an Amsoft blank beside a ruler, on which every opening and the label's second side are measured.
- Wikimedia Commons, [a museum's discs](https://commons.wikimedia.org/wiki/File:79_DISQUETES.jpg) and [an Amsoft blank](https://commons.wikimedia.org/wiki/File:AMSoft_Compact_Floppy_Disc_20071208.jpg) — the plastic's and the label's colours, the strip round the label end, and the label's first side.

**The firmware.**

- [Amstrad's permission](https://worldofspectrum.net/app/themes/wosc-classic/static/legacy/amstrad-roms.txt) — Cliff Lawson's 1999 answer, under which these images are fetched, and which the emulator's own `tools/fetch-roms.sh` records in full along with what it does not reach.
- [Arnold](https://github.com/rofl0r/arnold) — the two halves of the Spanish 6128's firmware, Amstrad part 40038, which the page joins and checks against its pin.
- [zenzx](https://github.com/ha1tch/zenzx) — the Spanish 464's firmware whole, which [SpecIde](https://github.com/MartianGirl/SpecIde) also carries byte for byte, and Sinclair's 48K firmware, the bytes the emulator pins from Fuse.
- [Caprice32](https://github.com/ColinPitrat/caprice32) — Amstrad's AMSDOS image, the ROM the disc interface brings, whose own format table gives the filler byte the tests' discs are formatted with.

**The glass.**

- [cpc.sylvestre.org](http://cpc.sylvestre.org/technique/technique_gfx8.html) — macro photographs of the CTM644's segmented colour columns.
- ["The Gate Array" (Grim)](http://web.archive.org/web/20260710174425id_/https://www.grimware.org/doku.php/documentations/devices/gatearray) — the colour pins of a 464's Gate Array measured for every code, from which each code's level on LUM is worked out.
- [nightfallcrew](https://www.nightfallcrew.com/08/08/2014/commodore-4032-fat40-8032-crt-replacement/) — the GT64's tube found interchangeable with Philips' M31-334GH.
- [Philips M31-330 series](https://frank.pocnet.net/other/CRT_Heerlen/M31-330-Series.pdf) — that tube's face contour, from which its glass's radius is worked out.
- [Toshiba Cathode Ray Tubes (1974)](<https://frank.pocnet.net/other/Toshiba/Toshiba_CathodeRayTubes(1974).pdf>) — the table that reads the GT64 tube's B31 as P31.
- [Philips Data Handbook T16 (1987)](http://bitsavers.trailing-edge.com/components/philips/_dataBooks/1987_T16_Philips_Monochrome_Tubes_and_Deflection_Units.pdf) — P31's colour, and how wide a tube of the GT64's class draws its lines.
- [AAPM TG18](https://www.aapm.org/pubs/reports/OR_03.pdf) — spot size and video bandwidth as a spatial spread.
- [pbrt, _Texture Sampling and Antialiasing_](https://pbr-book.org/4ed/Textures_and_Materials/Texture_Sampling_and_Antialiasing) — why a box average over a pixel still aliases.
- [CRT-Royale](https://docs.libretro.com/shader/crt_royale/#preset-versions) and [its account of bloom](https://docs.libretro.com/shader/crt_royale/#is-this-phosphor-bloom-realistic) — the cheaper glow the phosphors follow.
- [Sony CTV-25R1 training manual](https://www.manualslib.com/manual/1173519/Sony-Ctv-25r1.html?page=11) — a Trinitron's face, curved across and flat from top to bottom.
- [The emulator's command line](https://github.com/tulinmola/colophon-emulator/blob/0acb962/cli/main.c) — the Spectrum's raster, and where its paper stands in it.
- [zxdesign.info, Video Parameters](https://web.archive.org/web/2023id_/http://www.zxdesign.info/vidparam.shtml) and [Overscan](https://en.wikipedia.org/wiki/Overscan) — the 48K's 7 MHz pixels on PAL's 52 µs line, which shape them on a television.
- [Spectrum Computing forum](https://spectrumcomputing.co.uk/forums/viewtopic.php?p=127121) and [Personal Computer News, December 1984](https://archive.org/download/Personal-Computer-News/PersonalComputerNews090-08Dec1984.pdf) — how much border a television showed, as owners read it in photographs and as a review gave a Trinitron's resolution.

**The drawing.**

- glTF 2.0, [its units](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units) and [its images](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images) — metres with y up and the front toward +z, and a texture's first row at the top.
- [EXT_mesh_gpu_instancing](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing) — how an instance carries its turn.
- [three.js `TextureNode.grad`](https://threejs.org/docs/pages/TextureNode.html#grad) — why snapped rows need unsnapped gradients.

## License

MIT, like the rest of Colophon. The fonts in `tools/fonts/` are TeX Gyre Heros 2.004 by Bogusław Jackowski and Janusz M. Nowacki, its Vietnamese characters by Hàn Thế Thành, shipped unmodified under the GUST Font License; that licence, the family's manifest and its readme stand beside them. They are the builder's, not the page's: the prints are rendered from them and a few words drawn in solid from their outlines, and no font file reaches the browser. The font in `src/assets/fonts/` is the page's own, and does reach it: Patrick Hand 1.003 by Patrick Wagesreiter, shipped unmodified under the SIL Open Font License 1.1, whose text stands beside it, and it is served to the reader's browser rather than used only in the build.
