// Amstrad's own national systems were Spanish, French and Danish [A], SOFT 968
// Appendix XII: https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual.
// The Danish is not offered: no photograph of its keys is known, and no image
// of its firmware starts up as that appendix says it should. Germany's 6128 was
// Schneider's, lettered as the UK's [A], Schneider CPC6128 Handbuch, Kap. 7 S.
// 22: https://archive.org/details/Schneider_CPC6128_Handbuch_1985_Schneider_Computer_Division_DE
//
// The computers in the order they came out, each named as its model is, with
// the languages its keys were lettered in, and what may stand behind it and
// beside it, each by its model's name.
const COMPUTERS = [
  // Shown to the press in London on 23 April 1982 [C]: https://en.wikipedia.org/wiki/ZX_Spectrum. Its box reads "48K RAM" [B]: https://www.computerhistory.org/collections/catalog/102678097. It loads from "a normal domestic cassette recorder" [A], the ZX Spectrum Introduction, chapter six: https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_six.html
  // Sinclair stood a Sony television behind it on page 3 of its 1982 brochure [A], known by its cabinet as the KV-1400 [E]: https://spectrumforeveryone.com/wp-content/uploads/2020/08/Spectrum-Brochure.pdf. Having no recorder of its own, it is offered one from the start; tools/models/crc1001.js says why it is the Computone.
  {
    name: "spectrum48",
    title: "ZX Spectrum 48K",
    maker: "Sinclair Research",
    year: 1982,
    features: ["48 KB of memory", "Loads from a cassette recorder"],
    languages: ["en"],
    displays: ["kv1400"],
    beside: ["crc1001"],
    chosenAtFirst: ["crc1001"]
  },
  // Introduced in Britain in June 1984, with "64 KB RAM and an internal cassette deck" [C]: https://en.wikipedia.org/wiki/Amstrad_CPC. The deck is the datacorder, Amstrad's own name for it [A], CPC464 Service Manual: https://archive.org/details/Amstrad_CPC464_Service_Manual_1985_Amstrad_Consumer_Electronics
  // It is set up with the "AMSTRAD GT64 Green Tube Monitor" or the "AMSTRAD CTM640 Colour Monitor" [A], CPC464 user instructions, Setting up: https://archive.org/details/cpc464.en. Once the 664 and the 6128 came, the CTM640's stock sold out and only the CTM644 was sold, "even with the CPC464", the CTM640 with a 12 V supply added for their drives [C]: https://www.cpcwiki.eu/index.php/CTM640/CTM644. Its disc drive is the DDI-1, whose interface stands on the edge connector marked FLOPPY DISC at its rear [A], DDI-1 User Instructions: https://archive.org/download/manualsonline-id-073a0aea-c864-4724-8004-a2dbc04e2798/073a0aea-c864-4724-8004-a2dbc04e2798.pdf
  {
    name: "cpc464",
    title: "CPC 464",
    maker: "Amstrad",
    year: 1984,
    features: ["64 KB of memory", "Datacorder built in"],
    languages: ["en", "fr", "es"],
    displays: ["gt64", "ctm644"],
    beside: ["ddi1"],
    chosenAtFirst: []
  },
  // Released on 13 June 1985, with "128 KB RAM and an internal 3-inch floppy disk drive" [C]: https://en.wikipedia.org/wiki/Amstrad_CPC. Amstrad's own "3 inch compact floppy disc" [A], CPC6128 User Instructions, ch. 1: https://archive.org/details/amstrad-cpc-6128-user-manual
  // It takes 12 V from the monitor, its lead going "into the socket at the front of the monitor" [A], ibid., Foundation Course ch. 1 p. 2, a D.C. jack the CTM644 has, part 170844 [A], CPC6128 Service Manual p. 26: https://archive.org/details/amstrad-cpc-6128-micro-computer-ctm-644-color-monitor-gt-65-green-monitor-service-manual. The GT64 is the GT65 without that socket, which is "for the CPC664/CPC6128's disk drive", and once those came the GT64's stock sold out and only the GT65 was sold [C]: https://www.cpcwiki.eu/index.php/GT64/GT65. A 6128 before a GT64 wants its 12 V from elsewhere, and the GT65, which the manual names, is not modelled. A cassette unit joins it by Amsoft's CL1 lead "or any other equivalent standard cassette-interconnecting lead" [A], ibid., Foundation Course ch. 1 part 2.
  {
    name: "cpc6128",
    title: "CPC 6128",
    maker: "Amstrad",
    year: 1985,
    features: ["128 KB of memory", "3-inch disc drive built in"],
    languages: ["en", "fr", "de", "es"],
    displays: ["ctm644", "gt64"],
    beside: ["crc1001"],
    chosenAtFirst: []
  }
]

export default COMPUTERS
