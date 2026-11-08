import { SLOW_WAIT, blank, pointAt, settled, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"
import archive from "./archive.js"
import { resolve } from "node:path"

const PROBE = resolve(import.meta.dirname, "tape_probe.js")

// Where the lid and two of the keys stand on the canvas in the datacorder's view, and a place in the monitor's view where its picture shows the border, as fractions of its size.
const LID = { x: 0.44, y: 0.33 },
  PLAY = { x: 0.39, y: 0.745 },
  STOP_EJECT = { x: 0.63, y: 0.695 },
  BORDER = { x: 0.5, y: 0.235 }

// A tape made as the 464's firmware writes one [A], SOFT 968, ch. 8: https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual
// A record is a leader of 2048 one bits, a zero bit, a sync byte — &2C for a header, &16 for data — then 256 bytes, the logical NOT of their CRC high byte first, and a trailer of 32 one bits. The CRC is CCITT's, &1021 from a seed of &FFFF: the manual prints its polynomial "X15 +X12 +X5 +1", and the firmware's checksum is the sixteen-bit one.
// At the faster of the firmware's two speeds a zero bit is two pulses of 167 µs and a one bit two of 333 µs: "The commonly used faster setting is 167 microseconds (2000 baud)".
// The header names the file and gives its block number, that it is the last, its type, its length, where it loads, that it is the first, its length again and its entry, each at its own offset.
// The image is the TZX format's, which the CPC's .cdt is [A]: https://worldofspectrum.net/TZXformat.html — a pause block, then a turbo block for each record carrying its timings in a Spectrum's T-states, 3.5 to the microsecond.
const TZX_SIGNATURE = "ZXTape!\u001a",
  PAUSE_BLOCK = 0x20,
  TURBO_BLOCK = 0x11,
  HEADER_SYNC = 0x2c,
  DATA_SYNC = 0x16,
  SEGMENT = 256,
  LEADER_PULSES = 4096,
  TRAILER = 4,
  ZERO_PULSE = 583,
  ONE_PULSE = 1167,
  LEAD_IN = 3000,
  BETWEEN_RECORDS = 15,
  AFTER_DATA = 2000,
  BASIC_START = 0x0170

// One line of Locomotive BASIC as the 464 keeps it: its length, its number, BORDER's token &82, a space, an eight-bit number &19 followed by its value, the line's end, and the program's end [A], SOFT 968, Appendix III.
function borderProgram(colour) {
  return Buffer.from([0x09, 0x00, 0x0a, 0x00, 0x82, 0x20, 0x19, colour, 0x00, 0x00, 0x00])
}

function crc(bytes) {
  let sum = 0xffff

  for (const byte of bytes) {
    sum ^= byte << 8

    for (let bit = 0; bit < 8; bit++) {
      const carried = (sum & 0x8000) != 0

      sum = carried ? ((sum << 1) ^ 0x1021) & 0xffff : (sum << 1) & 0xffff
    }
  }

  return ~sum & 0xffff
}

function record(sync, contents, pause) {
  const segment = Buffer.alloc(SEGMENT),
    block = Buffer.alloc(0x13)

  contents.copy(segment)

  const checksum = crc(segment),
    bytes = Buffer.concat([
      Buffer.from([sync]),
      segment,
      Buffer.from([checksum >> 8, checksum & 0xff]),
      Buffer.alloc(TRAILER, 0xff)
    ])

  block[0] = TURBO_BLOCK
  block.writeUInt16LE(ONE_PULSE, 0x01)
  block.writeUInt16LE(ZERO_PULSE, 0x03)
  block.writeUInt16LE(ZERO_PULSE, 0x05)
  block.writeUInt16LE(ZERO_PULSE, 0x07)
  block.writeUInt16LE(ONE_PULSE, 0x09)
  block.writeUInt16LE(LEADER_PULSES, 0x0b)
  block[0x0d] = 8
  block.writeUInt16LE(pause, 0x0e)
  block.writeUIntLE(bytes.length, 0x10, 3)

  return Buffer.concat([block, bytes])
}

function tapeOf(name, program) {
  const header = Buffer.alloc(64)

  header.write(name, 0, "latin1")
  header[16] = 1
  header[17] = 0xff
  header.writeUInt16LE(program.length, 19)
  header.writeUInt16LE(BASIC_START, 21)
  header[23] = 0xff
  header.writeUInt16LE(program.length, 24)

  const opening = Buffer.from([...Buffer.from(TZX_SIGNATURE, "latin1"), 1, 20]),
    pause = Buffer.from([PAUSE_BLOCK, LEAD_IN & 0xff, LEAD_IN >> 8])

  return Buffer.concat([
    opening,
    pause,
    record(HEADER_SYNC, header, BETWEEN_RECORDS),
    record(DATA_SYNC, program, AFTER_DATA)
  ])
}

// The firmware's colour 26 is its brightest white.
const WHITE_BORDER = {
  name: "border.cdt",
  mimeType: "application/octet-stream",
  buffer: tapeOf("BORDER", borderProgram(26))
}

// What a pixel of the picture may stand above the dark it started from before it counts as lit.
const LIT = 40

// Listening once, before the desk stands, as the drive's tests do.
async function standListening(page) {
  const laidOut = []

  page.on("filechooser", function (chooser) {
    const file = laidOut.shift(),
      offered = file != null

    if (offered) {
      chooser.setFiles(file)
    }
  })

  await page.emulateMedia({ reducedMotion: "reduce" })
  await stand(page, "/cpc464.html")
  await page.getByRole("button", { name: "The datacorder" }).click()

  return laidOut
}

async function clickAt(page, place) {
  const point = await pointAt(page, place)

  await page.mouse.click(point.x, point.y)
}

async function chooseAtLid(page, laidOut, file) {
  laidOut.push(file)
  await clickAt(page, LID)
}

// RUN" is CONTROL and the small ENTER, which the user instructions give for loading the first program on a tape, and the firmware then asks for PLAY: https://archive.org/details/cpc464.en
async function runTape(page) {
  const desk = page.locator("colophon-cpc-desk")

  await desk.focus()
  await page.keyboard.down("Control")
  await page.keyboard.press("NumpadEnter")
  await page.keyboard.up("Control")
}

async function borderLight(page) {
  const point = await pointAt(page, BORDER),
    shot = await page.screenshot({ clip: { x: point.x, y: point.y, width: 1, height: 1 } }),
    pixels = await page.evaluate(async function (encoded) {
      const image = new Image()

      image.src = `data:image/png;base64,${encoded}`
      await image.decode()

      const canvas = new OffscreenCanvas(1, 1),
        context = canvas.getContext("2d")

      context.drawImage(image, 0, 0)

      return Array.from(context.getImageData(0, 0, 1, 1).data)
    }, shot.toString("base64")),
    [red, green, blue] = pixels

  return Math.max(red, green, blue)
}

function look(page, view) {
  return page.getByRole("button", { name: view }).click()
}

// The firmware empties the keyboard as it asks for PLAY, so the key that answers it waits until the question stands on the glass.
async function askForPlay(page) {
  await look(page, "The monitor")

  const dark = await borderLight(page)

  await runTape(page)
  await settled(page)

  return dark
}

test("the program on a tape runs once PLAY is down, and not before", async function ({
  page,
  context
}) {
  const allowed = SLOW_WAIT.timeout * 6

  test.setTimeout(allowed)

  const other = await context.newPage(),
    laidOut = await standListening(page),
    otherLaidOut = await standListening(other),
    notice = page.locator("output[name='datacorder']"),
    otherNotice = other.locator("output[name='datacorder']")

  await chooseAtLid(page, laidOut, WHITE_BORDER)
  await chooseAtLid(other, otherLaidOut, WHITE_BORDER)
  await expect(notice).toHaveText("border.cdt is in the datacorder")
  await expect(otherNotice).toHaveText("border.cdt is in the datacorder")

  const dark = await askForPlay(page),
    otherDark = await askForPlay(other)

  await look(page, "The datacorder")
  await clickAt(page, PLAY)
  await look(page, "The monitor")
  await page.keyboard.press("Space")
  await other.keyboard.press("Space")
  await expect.poll(() => borderLight(page), { timeout: allowed }).toBeGreaterThan(dark + LIT)

  const unplayed = await borderLight(other)

  expect(unplayed).toBeLessThan(otherDark + LIT)

  // The other machine was waiting for PLAY, and not merely behind.
  await look(other, "The datacorder")
  await clickAt(other, PLAY)
  await look(other, "The monitor")
  await expect.poll(() => borderLight(other), { timeout: allowed }).toBeGreaterThan(otherDark + LIT)
})

// The lead-in is 3 seconds of silence, and the header's record ends inside the next 3.
test("a tape wound into its lead-in still loads, and one wound past its header has nothing to load", async function ({
  page
}) {
  const allowed = SLOW_WAIT.timeout * 4

  test.setTimeout(allowed)
  await blank(page)

  const tape = Array.from(WHITE_BORDER.buffer),
    [intoLeadIn, pastHeader] = await page.evaluate(
      async function ([url, bytes]) {
        const { default: borderAfterWinding } = await import(url),
          lead = await borderAfterWinding(bytes, 1000, 12),
          past = await borderAfterWinding(bytes, 6500, 12)

        return [lead, past]
      },
      [`/@fs${PROBE}`, tape]
    )

  expect(intoLeadIn).toBeGreaterThan(pastHeader + LIT)
})

test("a file that is not a tape is refused", async function ({ page }) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='datacorder']"),
    notATape = { ...WHITE_BORDER, name: "notes.cdt", buffer: Buffer.from("notes") }

  await chooseAtLid(page, laidOut, notATape)
  await expect(notice).toHaveText(
    "notes.cdt was refused: carries no .cdt signature, and a bare .tap is a Spectrum's alone"
  )
})

test("an archive holding a tape puts that tape in, under its own name", async function ({ page }) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='datacorder']"),
    zipped = archive("cpc-power.zip", [
      { name: "readme.txt", contents: Buffer.from("notes") },
      { name: "BORDER.CDT", contents: WHITE_BORDER.buffer }
    ])

  await chooseAtLid(page, laidOut, zipped)
  await expect(notice).toHaveText("BORDER.CDT is in the datacorder")
})

test("STOP/EJECT lets PLAY up first, and only pressed again opens the lid", async function ({
  page
}) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='datacorder']")

  await chooseAtLid(page, laidOut, WHITE_BORDER)
  await expect(notice).toHaveText("border.cdt is in the datacorder")
  await clickAt(page, PLAY)
  await clickAt(page, STOP_EJECT)
  await expect(notice).toHaveText("border.cdt is in the datacorder")
  await clickAt(page, STOP_EJECT)
  await expect(notice).toBeHidden()
})

test("with nothing down, STOP/EJECT opens the lid at once", async function ({ page }) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='datacorder']")

  await chooseAtLid(page, laidOut, WHITE_BORDER)
  await expect(notice).toHaveText("border.cdt is in the datacorder")
  await clickAt(page, STOP_EJECT)
  await expect(notice).toBeHidden()
})
