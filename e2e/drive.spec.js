import { DRIVE, SLOW_WAIT, blank, pointAt, settled, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"

// Where the eject button stands on the canvas in the drive's view, as a fraction of its size.
const EJECT_BUTTON = { x: 0.594, y: 0.506 }

// The original image layout [C]: a 256-byte disc header naming the tracks and
// their size, then each track's 256-byte header listing its sectors before
// their bytes: https://cpctech.cpcwiki.de/docs/dsk.html
// AMSDOS's DATA format is 40 tracks of nine 512-byte sectors numbered &C1 to
// &C9, no track reserved, formatted with a gap of &52 [A]:
// https://archive.org/details/SOFT968TheAmstrad6128FirmwareManual
// Its filler byte is &E5 at &0A56 of the AMSDOS image the page fetches, in the
// parameter block AMSDOS starts from, which the switch to DATA, its table at
// &05CA, leaves as it stands [E]; SOFT 968 prints #E9, and the disagreement stands.
// A directory entry whose user number is &E5 holds no file, and one that holds
// a file gives its user number, eight letters of name and three of type [C]:
// https://www.seasip.info/Cpm/format22.html
const TRACKS = 40,
  SECTORS = 9,
  SIZE_CODE = 2,
  SECTOR_BYTES = 512,
  FIRST_SECTOR = 0xc1,
  GAP = 0x52,
  FILLER = 0xe5,
  HEADER_BYTES = 0x100,
  TRACK_BYTES = HEADER_BYTES + SECTORS * SECTOR_BYTES,
  SECTOR_INFO_BYTES = 8,
  DIRECTORY = HEADER_BYTES * 2,
  ENTRY_BYTES = 32

function blankDisc() {
  const image = Buffer.alloc(HEADER_BYTES + TRACKS * TRACK_BYTES)

  image.write("MV - CPCEMU Disk-File\r\nDisk-Info\r\n", 0, "latin1")
  image[0x30] = TRACKS
  image[0x31] = 1
  image.writeUInt16LE(TRACK_BYTES, 0x32)

  for (let track = 0; track < TRACKS; track++) {
    const at = HEADER_BYTES + track * TRACK_BYTES

    image.write("Track-Info\r\n", at, "latin1")
    image[at + 0x10] = track
    image[at + 0x14] = SIZE_CODE
    image[at + 0x15] = SECTORS
    image[at + 0x16] = GAP
    image[at + 0x17] = FILLER

    for (let sector = 0; sector < SECTORS; sector++) {
      const info = at + 0x18 + sector * SECTOR_INFO_BYTES

      image[info] = track
      image[info + 2] = FIRST_SECTOR + sector
      image[info + 3] = SIZE_CODE
    }

    image.fill(FILLER, at + HEADER_BYTES, at + TRACK_BYTES)
  }

  return image
}

// An empty file, for user 0, at the head of the directory.
function discHolding(name, type) {
  const image = blankDisc(),
    paddedName = name.padEnd(8),
    paddedType = type.padEnd(3)

  image.fill(0, DIRECTORY, DIRECTORY + ENTRY_BYTES)
  image.write(paddedName, DIRECTORY + 1, "latin1")
  image.write(paddedType, DIRECTORY + 9, "latin1")

  return image
}

const OCTETS = "application/octet-stream",
  BLANK = { name: "blank.dsk", mimeType: OCTETS, buffer: blankDisc() },
  HOLDING = { name: "holding.dsk", mimeType: OCTETS, buffer: discHolding("COLOPHON", "TXT") }

// Playwright asks the browser to hand it the chooser without waiting for the
// answer, so a click sent straight after listening can reach the browser first,
// which opens its own dialog and cancels it. A test listens before the desk
// stands, and the promise travels in an object, which an async function
// returns as it is rather than waiting on it.
async function standListening(page) {
  const chooser = page.waitForEvent("filechooser")

  await page.emulateMedia({ reducedMotion: "reduce" })
  await stand(page)

  return { chooser }
}

async function chooseAtDrive(page, chooser, file) {
  const drive = await pointAt(page, DRIVE)

  await page.mouse.click(drive.x, drive.y)

  const opened = await chooser

  await opened.setFiles(file)
}

// The machine drops keys typed while it is still drawing its prompt.
async function catalogue(page) {
  const desk = page.locator("colophon-cpc-desk"),
    monitor = desk.getByRole("button", { name: "The monitor" })

  await settled(page)
  await desk.focus()
  await page.keyboard.type("cat")
  await page.keyboard.press("Enter")
  await monitor.click()

  return settled(page)
}

test("the machine catalogues the disc chosen at the drive", async function ({ page, context }) {
  const allowed = SLOW_WAIT.timeout * 4

  test.setTimeout(allowed)

  const other = await context.newPage(),
    { chooser } = await standListening(page),
    { chooser: otherChooser } = await standListening(other),
    notice = page.locator("output[name='drive']"),
    otherNotice = other.locator("output[name='drive']")

  await chooseAtDrive(page, chooser, BLANK)
  await chooseAtDrive(other, otherChooser, HOLDING)
  await expect(notice).toHaveText("blank.dsk is in drive A")
  await expect(otherNotice).toHaveText("holding.dsk is in drive A")

  const catalogued = await catalogue(page),
    holding = await catalogue(other),
    read = !catalogued.equals(holding)

  expect(read).toBe(true)
})

test("a disc chosen at the drive is named in the notice, and the camera comes back", async function ({
  page
}) {
  const { chooser } = await standListening(page),
    notice = page.locator("output[name='drive']"),
    whole = page.getByRole("button", { name: "The whole desk" })

  await chooseAtDrive(page, chooser, BLANK)
  await expect(notice).toHaveText("blank.dsk is in drive A")
  await expect(whole).toHaveAttribute("aria-pressed", "true")
})

test("a file that is not a disc is refused, and the notice says why", async function ({ page }) {
  const { chooser } = await standListening(page),
    notice = page.locator("output[name='drive']"),
    notes = { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Not a disc.") }

  await chooseAtDrive(page, chooser, notes)
  await expect(notice).toHaveText("notes.txt was refused: the image is shorter than its own header")
})

test("an image larger than a disc's room is refused by its size", async function ({ page }) {
  const { chooser } = await standListening(page),
    notice = page.locator("output[name='drive']"),
    huge = { name: "huge.dsk", mimeType: OCTETS, buffer: Buffer.alloc(0x400000) }

  await chooseAtDrive(page, chooser, huge)
  await expect(notice).toHaveText(
    "huge.dsk was refused: the image is larger than the room a disc is given here"
  )
})

test("the eject button leaves the machine as if it had never been given a disc", async function ({
  page,
  context
}) {
  const allowed = SLOW_WAIT.timeout * 4

  test.setTimeout(allowed)

  const never = await context.newPage(),
    { chooser } = await standListening(page),
    notice = page.locator("output[name='drive']")

  await never.emulateMedia({ reducedMotion: "reduce" })
  await stand(never)
  await chooseAtDrive(page, chooser, BLANK)
  await expect(notice).toBeVisible()
  await page.getByRole("button", { name: "The disc drive" }).click()

  const eject = await pointAt(page, EJECT_BUTTON)

  await page.mouse.click(eject.x, eject.y)
  await expect(notice).toBeHidden()

  const ejected = await catalogue(page),
    empty = await catalogue(never),
    alike = ejected.equals(empty)

  expect(alike).toBe(true)
})

test("a choice cancelled takes the camera back to the view it left", async function ({ page }) {
  const { chooser } = await standListening(page),
    desk = page.locator("colophon-cpc-desk"),
    driveButton = desk.getByRole("button", { name: "The disc drive" }),
    wholeButton = desk.getByRole("button", { name: "The whole desk" }),
    fileInput = desk.locator("input[type='file']"),
    drive = await pointAt(page, DRIVE)

  await page.mouse.click(drive.x, drive.y)
  await chooser
  await expect(driveButton).toHaveAttribute("aria-pressed", "true")

  await fileInput.dispatchEvent("cancel")
  await expect(wholeButton).toHaveAttribute("aria-pressed", "true")
})

// The lamp is lit for the moments an access lasts, too few to photograph, so
// the line that lights it is read from the machine itself, which is run here
// with nothing drawn.
function catalogueOnMachine(page, disc) {
  return page.evaluate(async function (encoded) {
    const { Cpc, KEY_MATRIX } = await import("/js/emulator/index.js"),
      machine = new AbortController(),
      cpc = await Cpc.create(machine.signal, 1)

    let clock = 0

    function run(milliseconds) {
      clock += milliseconds
      cpc.advance(clock)
    }

    for (let frame = 0; frame < 80; frame++) {
      run(80)
    }

    if (encoded != null) {
      const decoded = atob(encoded),
        bytes = Uint8Array.from(decoded, letter => letter.charCodeAt(0))

      cpc.insertDisc(bytes)
    }

    const atPrompt = cpc.driveInUse()

    for (const code of ["KeyC", "KeyA", "KeyT", "Enter"]) {
      const [key] = KEY_MATRIX[code]

      cpc.pressKey(key)
      run(80)
      cpc.releaseKey(key)
      run(80)
    }

    let lit = false

    for (let frame = 0; frame < 200 && !lit; frame++) {
      run(20)
      lit = cpc.driveInUse()
    }

    cpc.dispose()

    return { atPrompt, lit }
  }, disc)
}

test("the drive's lamp line goes up while the machine reads the disc", async function ({ page }) {
  await blank(page)

  const disc = blankDisc().toString("base64"),
    seen = await catalogueOnMachine(page, disc)

  expect(seen).toEqual({ atPrompt: false, lit: true })
})

// A command that finds no disc names the drive and fails, and the machine's own
// lamp answers the try, because it is the drive's selection that lights it.
test("the drive's lamp line goes up for a try at a drive with no disc in it", async function ({
  page
}) {
  await blank(page)

  const seen = await catalogueOnMachine(page, null)

  expect(seen).toEqual({ atPrompt: false, lit: true })
})
