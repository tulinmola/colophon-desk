import { SLOW_WAIT, blank, pointAt, settled, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"
import archive from "./archive.js"
import { resolve } from "node:path"

const PROBE = resolve(import.meta.dirname, "spectrum_tape_probe.js")

// Where the lid and two of the keys stand on the canvas in the recorder's view, and a place in the monitor's view where its picture shows the border, as fractions of its size.
const LID = { x: 0.47, y: 0.5 },
  PLAY = { x: 0.427, y: 0.79 },
  STOP_EJECT = { x: 0.587, y: 0.778 },
  BORDER = { x: 0.5, y: 0.13 }

// A tape as the 48K's own SAVE writes one: each block opens with its flag, 0 for a header and FF for data, and closes with its parity, every byte before it XORed together from the flag on [C], SA-BYTES: https://skoolkid.github.io/rom/asm/04C2.html. A program's header holds its type, 0, its name in ten letters, the length of the program and its variables, the line it runs from and the length of the program alone, at IX+00, +01, +0B, +0D and +0F [C], SAVE-ETC: https://skoolkid.github.io/rom/asm/0605.html
// In a .tap each block is preceded by "two bytes specifying how many bytes will follow" [C]: https://worldofspectrum.org/faq/reference/formats.htm
const HEADER = 0x00,
  DATA = 0xff,
  PROGRAM = 0,
  NAME_LETTERS = 10,
  RUN_FROM = 10

// A stop the image marks, which TZX writes as a pause of no length, and the block that carries a .tap's block whole at the ROM's timings, its pause first [A]: https://worldofspectrum.net/TZXformat.html
const TZX_SIGNATURE = "ZXTape!\u001a",
  STANDARD_BLOCK = 0x10,
  PAUSE_BLOCK = 0x20,
  PAUSE_AFTER = 1000

// One line of Sinclair BASIC as the 48K keeps it: its number, the more significant byte first, the length of its text and ENTER, the text and ENTER [A], ch. 24, "Each line of BASIC program has the form:": https://worldofspectrum.org/ZXBasicManual/zxmanchap24.html. The text is BORDER's token and the colour's digit, followed by CHR$ 14 and the number in five bytes, a whole number's being 0, its sign, its less and more significant bytes and 0 [A], ibid.
const BORDER_TOKEN = 0xe7,
  NUMBER = 0x0e,
  ENTER = 0x0d,
  DIGIT_ZERO = 0x30

// Green is the one colour a 48K's border never shows while it loads, which is red and cyan for a leader and blue and yellow for data [C]: https://skoolkid.github.io/rom/asm/04C2.html
const GREEN = 4

function borderProgram(colour) {
  const text = Buffer.from([BORDER_TOKEN, DIGIT_ZERO + colour, NUMBER, 0, 0, colour, 0, 0, ENTER]),
    opening = Buffer.alloc(4)

  opening.writeUInt16BE(RUN_FROM, 0)
  opening.writeUInt16LE(text.length, 2)

  return Buffer.concat([opening, text])
}

function block(flag, contents) {
  const bytes = Buffer.from([flag, ...contents])

  let parity = 0

  for (const byte of bytes) {
    parity ^= byte
  }

  return Buffer.concat([bytes, Buffer.from([parity])])
}

function blocksOf(name, program) {
  const header = Buffer.alloc(17, 0x20)

  header[0] = PROGRAM
  header.write(name.padEnd(NAME_LETTERS), 1, "latin1")
  header.writeUInt16LE(program.length, 11)
  header.writeUInt16LE(RUN_FROM, 13)
  header.writeUInt16LE(program.length, 15)

  return [block(HEADER, header), block(DATA, program)]
}

function tapOf(name, program) {
  const blocks = blocksOf(name, program).map(function (bytes) {
    const length = Buffer.alloc(2)

    length.writeUInt16LE(bytes.length)

    return Buffer.concat([length, bytes])
  })

  return Buffer.concat(blocks)
}

// The same two blocks, with the image's stop marked between them.
function tzxStoppingOf(name, program) {
  const [header, data] = blocksOf(name, program),
    opening = Buffer.from([...Buffer.from(TZX_SIGNATURE, "latin1"), 1, 20]),
    stop = Buffer.from([PAUSE_BLOCK, 0, 0])

  function standard(bytes) {
    const heading = Buffer.alloc(5)

    heading[0] = STANDARD_BLOCK
    heading.writeUInt16LE(PAUSE_AFTER, 1)
    heading.writeUInt16LE(bytes.length, 3)

    return Buffer.concat([heading, bytes])
  }

  return Buffer.concat([opening, standard(header), stop, standard(data)])
}

const GREEN_BORDER = {
    name: "border.tap",
    mimeType: "application/octet-stream",
    buffer: tapOf("border", borderProgram(GREEN))
  },
  STOPPING = {
    name: "stopping.tzx",
    mimeType: "application/octet-stream",
    buffer: tzxStoppingOf("border", borderProgram(GREEN))
  }

// What green must stand above the red and blue beside it before the border counts as green.
const GREENER = 40

function look(page, view) {
  return page.getByRole("button", { name: view }).click()
}

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
  await stand(page, "/spectrum48.html")
  await look(page, "The cassette recorder")

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

async function pressPlay(page) {
  await look(page, "The cassette recorder")
  await clickAt(page, PLAY)
  await look(page, "The monitor")
}

// LOAD "" takes "the first program it comes across" [A], ch. 20: https://worldofspectrum.org/ZXBasicManual/zxmanchap20.html. It is J, which the 48K reads as LOAD where a statement begins, SYMBOL SHIFT and P twice for the quotes, and ENTER, as the keys are printed: tools/models/spectrum48.js. The browser's CONTROL is SYMBOL SHIFT.
async function typeLoad(page) {
  const desk = page.locator("colophon-spectrum-desk")

  await desk.focus()
  await page.keyboard.press("KeyJ")
  await settled(page)
  await page.keyboard.down("Control")
  await page.keyboard.press("KeyP")
  await settled(page)
  await page.keyboard.press("KeyP")
  await page.keyboard.up("Control")
  await settled(page)
  await page.keyboard.press("Enter")
  await settled(page)
}

async function borderGreenness(page) {
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

  return green - Math.max(red, blue)
}

// A tape played would set the border flashing, so a picture standing still is a machine still waiting for one.
test("the program on a tape runs once PLAY is down, and not before", async function ({ page }) {
  const allowed = SLOW_WAIT.timeout * 6

  test.setTimeout(allowed)

  const laidOut = await standListening(page),
    notice = page.locator("output[name='recorder']")

  await chooseAtLid(page, laidOut, GREEN_BORDER)
  await expect(notice).toHaveText("border.tap is in the cassette recorder")
  await look(page, "The monitor")
  await typeLoad(page)
  await settled(page)

  const waiting = await borderGreenness(page)

  expect(waiting).toBeLessThan(GREENER)
  await pressPlay(page)
  await expect.poll(() => borderGreenness(page), { timeout: allowed }).toBeGreaterThan(GREENER)
})

// The header plays for about 6 seconds and the data for about 3, so the tape has long stopped at the mark between them.
test("a tape stops where its image marks a stop, and plays on from there once PLAY is pressed again", async function ({
  page
}) {
  test.setTimeout(SLOW_WAIT.timeout * 4)
  await blank(page)

  const tape = Array.from(STOPPING.buffer),
    [stopped, playedOn] = await page.evaluate(
      async function ([url, bytes]) {
        const { playedTwice } = await import(url)

        return playedTwice(bytes, 12)
      },
      [`/@fs${PROBE}`, tape]
    )

  expect(stopped.marked).toBe(true)
  expect(stopped.border).not.toBe(GREEN)
  expect(playedOn.marked).toBe(false)
  expect(playedOn.border).toBe(GREEN)
})

// The tape stands at its mark with the program not yet loaded, so the picture comes to rest without the green it sets; PLAY comes up there, so pressing it again sets the tape going, where were it still down pressing it would change nothing.
test("PLAY comes up where the tape stops", async function ({ page }) {
  const allowed = SLOW_WAIT.timeout * 6

  test.setTimeout(allowed)

  const laidOut = await standListening(page),
    notice = page.locator("output[name='recorder']")

  await chooseAtLid(page, laidOut, STOPPING)
  await expect(notice).toHaveText("stopping.tzx is in the cassette recorder")
  await look(page, "The monitor")
  await typeLoad(page)
  await pressPlay(page)
  await settled(page, { timeout: allowed / 2 })

  const halted = await borderGreenness(page)

  expect(halted).toBeLessThan(GREENER)
  await expect
    .poll(
      async function () {
        await pressPlay(page)

        return borderGreenness(page)
      },
      { timeout: allowed / 2, intervals: [SLOW_WAIT.timeout / 4] }
    )
    .toBeGreaterThan(GREENER)
})

// A tape's length runs past its marks, so the same blocks with a stop between them play as long as without one.
test("a tape is measured past the stops it marks", async function ({ page }) {
  await blank(page)

  const [stopping, whole] = await page.evaluate(
    async function ([url, marked, unmarked]) {
      const { recordedLength } = await import(url)

      return [await recordedLength(marked), await recordedLength(unmarked)]
    },
    [`/@fs${PROBE}`, Array.from(STOPPING.buffer), Array.from(GREEN_BORDER.buffer)]
  )

  expect(stopping).toBeCloseTo(whole)
})

test("a file that is not a tape is refused", async function ({ page }) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='recorder']"),
    notATape = { ...GREEN_BORDER, name: "notes.tap", buffer: Buffer.from("notes") }

  await chooseAtLid(page, laidOut, notATape)
  await expect(notice).toHaveText(
    "notes.tap was refused: does not divide into blocks, so it is not a tape"
  )
})

test("an archive holding a tape puts that tape in, under its own name", async function ({ page }) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='recorder']"),
    zipped = archive("spectrum.zip", [
      { name: "readme.txt", contents: Buffer.from("notes") },
      { name: "BORDER.TAP", contents: GREEN_BORDER.buffer }
    ])

  await chooseAtLid(page, laidOut, zipped)
  await expect(notice).toHaveText("BORDER.TAP is in the cassette recorder")
})

test("STOP/EJ. lets PLAY up first, and only pressed again opens the lid", async function ({
  page
}) {
  const laidOut = await standListening(page),
    notice = page.locator("output[name='recorder']")

  await chooseAtLid(page, laidOut, GREEN_BORDER)
  await expect(notice).toHaveText("border.tap is in the cassette recorder")
  await clickAt(page, PLAY)
  await clickAt(page, STOP_EJECT)
  await expect(notice).toHaveText("border.tap is in the cassette recorder")
  await clickAt(page, STOP_EJECT)
  await expect(notice).toBeHidden()
})
