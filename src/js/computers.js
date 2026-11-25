// The computers in the order they came out, each named as its model is.
const COMPUTERS = [
  // Shown to the press in London on 23 April 1982 [C]: https://en.wikipedia.org/wiki/ZX_Spectrum. Its box reads "48K RAM" [B]: https://www.computerhistory.org/collections/catalog/102678097. It loads from "a normal domestic cassette recorder" [A], the ZX Spectrum Introduction, chapter six: https://worldofspectrum.org/ZXSpectrumIntroduction/chapter_six.html
  {
    name: "spectrum48",
    title: "ZX Spectrum 48K",
    maker: "Sinclair Research",
    year: 1982,
    features: ["48 KB of memory", "Loads from a cassette recorder"]
  },
  // Introduced in Britain in June 1984, with "64 KB RAM and an internal cassette deck" [C]: https://en.wikipedia.org/wiki/Amstrad_CPC. The deck is the datacorder, Amstrad's own name for it [A], CPC464 Service Manual: https://archive.org/details/Amstrad_CPC464_Service_Manual_1985_Amstrad_Consumer_Electronics
  {
    name: "cpc464",
    title: "CPC 464",
    maker: "Amstrad",
    year: 1984,
    features: ["64 KB of memory", "Datacorder built in"]
  },
  // Released on 13 June 1985, with "128 KB RAM and an internal 3-inch floppy disk drive" [C]: https://en.wikipedia.org/wiki/Amstrad_CPC. Amstrad's own "3 inch compact floppy disc" [A], CPC6128 User Instructions, ch. 1: https://archive.org/details/amstrad-cpc-6128-user-manual
  {
    name: "cpc6128",
    title: "CPC 6128",
    maker: "Amstrad",
    year: 1985,
    features: ["128 KB of memory", "3-inch disc drive built in"]
  }
]

export default COMPUTERS
