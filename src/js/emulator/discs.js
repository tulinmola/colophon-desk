// A file the reader offers is a disc image, or an archive holding some. The
// container is read here and nothing more: whether what comes out of it is a
// disc is the machine's to say, and it says so when the drive is offered one.
// The layout [A], PKWARE's own, and the flag that tells a name's encoding: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
const DIRECTORY_ENTRY = 0x02014b50,
  LOCAL_HEADER = 0x04034b50,
  END_OF_DIRECTORY = 0x06054b50,
  END_OF_DIRECTORY_BYTES = 22,
  DIRECTORY_ENTRY_BYTES = 46,
  LOCAL_HEADER_BYTES = 30

// A comment of up to this stands behind the record that ends an archive, and the record is found by looking back past it.
const LONGEST_COMMENT = 0xffff

const STORED = 0,
  DEFLATED = 8

const ENCRYPTED = 1,
  UNICODE_NAMES = 1 << 11

// A field standing at its largest says the true figure is kept in a Zip64 record, which this desk does not read.
const OVERFLOWED = 0xffffffff,
  OVERFLOWED_COUNT = 0xffff

const DISC = ".dsk"

// A name is Unicode only where the archive says so. Every other one was
// written on a machine whose own code page nobody recorded, and the one those
// machines shared is this, which no browser decodes [C]: https://en.wikipedia.org/wiki/Code_page_437
const CODE_PAGE_437 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ "

const ASCII = 0x80

const UNICODE = new TextDecoder()

function nameOf(raw, flags) {
  const unicode = (flags & UNICODE_NAMES) != 0

  if (unicode) {
    return UNICODE.decode(raw)
  }

  let name = ""

  for (const byte of raw) {
    const high = byte >= ASCII,
      letter = high ? CODE_PAGE_437[byte - ASCII] : String.fromCharCode(byte)

    name += letter
  }

  return name
}

function endOfDirectory(view, length) {
  const furthest = Math.min(length, END_OF_DIRECTORY_BYTES + LONGEST_COMMENT)

  for (let back = END_OF_DIRECTORY_BYTES; back <= furthest; back++) {
    const at = length - back,
      signed = view.getUint32(at, true) == END_OF_DIRECTORY,
      // The same four bytes can stand inside a comment, and what tells the
      // record from them is that its own comment reaches exactly the end.
      commented = signed && view.getUint16(at + 20, true) == back - END_OF_DIRECTORY_BYTES

    if (commented) {
      return at
    }
  }

  throw new Error("it is not an archive this desk can open")
}

function entriesOf(view, bytes) {
  const end = endOfDirectory(view, bytes.length),
    count = view.getUint16(end + 10, true),
    size = view.getUint32(end + 12, true),
    offset = view.getUint32(end + 16, true),
    overflowed = count == OVERFLOWED_COUNT || size == OVERFLOWED || offset == OVERFLOWED

  if (overflowed) {
    throw new Error("it is larger than this desk can read")
  }

  // Every offset in the directory is counted from the start of the archive,
  // which is not the start of the file when something stands in front of it.
  const prefix = end - size - offset,
    sound = prefix >= 0

  if (!sound) {
    throw new Error("its list of files is damaged")
  }

  const entries = []

  let at = offset + prefix

  for (let entry = 0; entry < count; entry++) {
    const held = at + DIRECTORY_ENTRY_BYTES <= bytes.length,
      listed = held && view.getUint32(at, true) == DIRECTORY_ENTRY

    if (!listed) {
      throw new Error("its list of files is damaged")
    }

    const flags = view.getUint16(at + 8, true),
      method = view.getUint16(at + 10, true),
      packed = view.getUint32(at + 20, true),
      length = view.getUint32(at + 24, true),
      nameLength = view.getUint16(at + 28, true),
      extraLength = view.getUint16(at + 30, true),
      commentLength = view.getUint16(at + 32, true),
      headerAt = view.getUint32(at + 42, true),
      raw = bytes.subarray(at + DIRECTORY_ENTRY_BYTES, at + DIRECTORY_ENTRY_BYTES + nameLength),
      name = nameOf(raw, flags)

    entries.push({ name, flags, method, packed, length, headerAt: headerAt + prefix })
    at += DIRECTORY_ENTRY_BYTES + nameLength + extraLength + commentLength
  }

  return entries
}

// The lengths in an entry's own header may differ from the directory's, so the
// data is found past the header's copy of them and never past the directory's.
function packedBytes(view, bytes, entry) {
  const held = entry.headerAt + LOCAL_HEADER_BYTES <= bytes.length,
    headed = held && view.getUint32(entry.headerAt, true) == LOCAL_HEADER

  if (!headed) {
    throw new Error("its list of files is damaged")
  }

  const nameLength = view.getUint16(entry.headerAt + 26, true),
    extraLength = view.getUint16(entry.headerAt + 28, true),
    from = entry.headerAt + LOCAL_HEADER_BYTES + nameLength + extraLength

  return bytes.subarray(from, from + entry.packed)
}

async function unpack(view, bytes, entry) {
  const locked = (entry.flags & ENCRYPTED) != 0,
    overflowed = entry.length == OVERFLOWED || entry.headerAt == OVERFLOWED,
    known = entry.method == STORED || entry.method == DEFLATED

  if (locked) {
    throw new Error("the disc in it is locked")
  }

  if (overflowed) {
    throw new Error("it is larger than this desk can read")
  }

  if (!known) {
    throw new Error("the disc in it is packed in a way this desk cannot open")
  }

  const packed = packedBytes(view, bytes, entry),
    stored = entry.method == STORED

  if (stored) {
    return packed
  }

  // Every browser that draws this page has carried the decompressor for years, so none is shipped here: https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream
  const inflating = new DecompressionStream("deflate-raw"),
    file = new Blob([packed]),
    inflated = file.stream().pipeThrough(inflating),
    whole = new Response(inflated),
    buffer = await whole.arrayBuffer()

  return new Uint8Array(buffer)
}

function isDisc({ name }) {
  const suffix = name.slice(-DISC.length)

  return suffix.toLowerCase() == DISC
}

// An archive names each disc in it; a disc image is the one disc it is, under
// the name the reader's own file carries. Neither is read until one is chosen.
export default function discsIn(filename, bytes) {
  const archived = bytes[0] == 0x50 && bytes[1] == 0x4b

  if (!archived) {
    return [{ name: filename, length: bytes.length, read: () => bytes }]
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    entries = entriesOf(view, bytes),
    discs = entries.filter(isDisc)

  return discs.map(function (entry) {
    return {
      name: entry.name,
      length: entry.length,
      read: () => unpack(view, bytes, entry)
    }
  })
}
