// Amstrad's permission is what these are fetched under, and the reader's own
// browser is what fetches them, so nothing here is ever distributed with the
// desk. Cliff Lawson answered for the ROMs in August 1999 and cross-posted the
// reply to comp.sys.amstrad.8bit "because it applies equally well to all the
// CPC stuff": the copyright messages stay intact, Amstrad's copyright is
// acknowledged, and nobody charges. It does not reach everything — the CPC
// firmware is also Locomotive Software's, a separate permission nobody has
// sought, and AMSDOS carries no copyright message for the first term to keep.
// The full record is the emulator's own tools/fetch-roms.sh.
// https://worldofspectrum.net/app/themes/wosc-classic/static/legacy/amstrad-roms.txt
//
// A part is only ever half an image: the Spanish 6128 keeps its operating
// system and its BASIC in separate files, and the machine wants them joined in
// that order.
const IMAGES = {
  // Amstrad part 40038, the Spanish 6128's firmware, joined from the two
  // halves Arnold keeps: https://github.com/rofl0r/arnold
  cpc6128es: {
    sha256: "49c5b2da99bf3230dec3e4bfbb136609ae5f8d250d8920be0ebda1e5a256f88a",
    parts: [
      "https://raw.githubusercontent.com/rofl0r/arnold/master/roms/cpc6128s/os.rom",
      "https://raw.githubusercontent.com/rofl0r/arnold/master/roms/cpc6128s/basic.rom"
    ]
  },
  // The ROM the disc interface brings, from Caprice32's copy of Amstrad's
  // image: https://github.com/ColinPitrat/caprice32
  amsdos: {
    sha256: "ea65e0fb44ee93ede4b6c507509b7e5ddf497fb7155023bea91ef229469fa04d",
    parts: ["https://raw.githubusercontent.com/ColinPitrat/caprice32/master/rom/amsdos.rom"]
  }
}

// Keyed by the pin itself, so a changed pin misses what the old one left and
// nothing has to be versioned or swept.
const KEPT_UNDER = "colophon-desk:firmware:"

// String.fromCharCode takes its bytes as arguments, and an image at once would
// spread tens of thousands of them across a call the engine bounds.
const LETTERS_AT_A_TIME = 0x1000

async function digestOf(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes),
    read = new Uint8Array(digest),
    octets = Array.from(read)

  return octets.map(octet => octet.toString(16).padStart(2, "0")).join("")
}

function encode(bytes) {
  const pieces = []

  for (let at = 0; at < bytes.length; at += LETTERS_AT_A_TIME) {
    const piece = bytes.subarray(at, at + LETTERS_AT_A_TIME)

    pieces.push(String.fromCharCode(...piece))
  }

  const letters = pieces.join("")

  return btoa(letters)
}

function decode(text) {
  const letters = atob(text),
    bytes = new Uint8Array(letters.length)

  for (let at = 0; at < letters.length; at++) {
    bytes[at] = letters.charCodeAt(at)
  }

  return bytes
}

// A browser told to keep nothing throws rather than answers, and a desk that
// cannot keep an image is only a desk that fetches it again.
function readKept(sha256) {
  try {
    const text = localStorage.getItem(KEPT_UNDER + sha256)

    return text == null ? null : decode(text)
  } catch {
    return null
  }
}

function keep(sha256, bytes) {
  try {
    localStorage.setItem(KEPT_UNDER + sha256, encode(bytes))
  } catch {
    // Kept or not, the image in hand is the one the machine boots.
  }
}

async function fetchParts(parts, signal) {
  const pieces = []

  for (const url of parts) {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}`)
    }

    const piece = await response.arrayBuffer()

    pieces.push(new Uint8Array(piece))
  }

  const length = pieces.reduce((total, piece) => total + piece.length, 0),
    image = new Uint8Array(length)

  let at = 0
  for (const piece of pieces) {
    image.set(piece, at)
    at += piece.length
  }

  return image
}

export default async function fetchFirmware(name, signal) {
  const { sha256, parts } = IMAGES[name],
    kept = readKept(sha256)

  if (kept) {
    const digest = await digestOf(kept),
      trusted = digest == sha256

    if (trusted) {
      return kept
    }
  }

  const image = await fetchParts(parts, signal),
    digest = await digestOf(image),
    pinned = digest == sha256

  if (!pinned) {
    throw new Error(`${name} fetched as ${digest}, which is not the ${sha256} it is pinned to`)
  }

  keep(sha256, image)

  return image
}
