import { deflateRawSync } from "node:zlib"

// An archive as a reader's own would be: each file behind a header of its own,
// then a directory of them, then the record that ends it [A]:
// https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
// Deflate is what a zip tool reaches for and what the desk unpacks; the
// checksums are left at zero, which nothing in the desk reads.
const LOCAL_HEADER = 0x04034b50,
  DIRECTORY_ENTRY = 0x02014b50,
  END_OF_DIRECTORY = 0x06054b50,
  DEFLATED = 8,
  UNICODE_NAMES = 1 << 11

function archiveOf(files) {
  const headers = [],
    directory = []

  let at = 0

  for (const { name, contents, unicode = true } of files) {
    const named = Buffer.from(name, unicode ? "utf8" : "latin1"),
      packed = deflateRawSync(contents),
      flags = unicode ? UNICODE_NAMES : 0,
      header = Buffer.alloc(30)

    header.writeUInt32LE(LOCAL_HEADER, 0)
    header.writeUInt16LE(flags, 6)
    header.writeUInt16LE(DEFLATED, 8)
    header.writeUInt32LE(packed.length, 18)
    header.writeUInt32LE(contents.length, 22)
    header.writeUInt16LE(named.length, 26)

    const entry = Buffer.alloc(46)

    entry.writeUInt32LE(DIRECTORY_ENTRY, 0)
    entry.writeUInt16LE(flags, 8)
    entry.writeUInt16LE(DEFLATED, 10)
    entry.writeUInt32LE(packed.length, 20)
    entry.writeUInt32LE(contents.length, 24)
    entry.writeUInt16LE(named.length, 28)
    entry.writeUInt32LE(at, 42)

    headers.push(header, named, packed)
    directory.push(entry, named)
    at += header.length + named.length + packed.length
  }

  const listed = Buffer.concat(directory),
    end = Buffer.alloc(22)

  end.writeUInt32LE(END_OF_DIRECTORY, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(listed.length, 12)
  end.writeUInt32LE(at, 16)

  return Buffer.concat([...headers, listed, end])
}

export default function archive(name, files) {
  return { name, mimeType: "application/zip", buffer: archiveOf(files) }
}
