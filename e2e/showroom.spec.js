import { expect, test } from "@playwright/test"
import { SLOW_WAIT } from "./desk_scene.js"

const BARE = ".showroom > canvas { visibility: hidden; }"

// Where frames are slow a journey there and back takes most of the default
// half minute, before anything is looked at.
test.describe.configure({ timeout: 90000 })

// The page has finished going wherever it was asked to.
async function arrived(page) {
  await expect(page.locator("main")).toHaveAttribute("aria-busy", "false", SLOW_WAIT)
}

async function within(page, locator, style) {
  const box = await locator.boundingBox(),
    clip = { x: box.x, y: box.y, width: box.width, height: box.height }

  return page.screenshot({ clip, style })
}

// Whether the canvas draws anything within an element's box: the same box
// with the canvas hidden shows only the page behind it.
async function drawnWithin(page, locator) {
  const drawn = await within(page, locator),
    bare = await within(page, locator, BARE)

  return !drawn.equals(bare)
}

async function expectDrawnInEvery(page, items) {
  const frames = await items.locator(".frame").all()

  for (const frame of frames) {
    const drawn = await drawnWithin(page, frame)

    expect(drawn).toBe(true)
  }
}

async function expectDrawnOnStage(page) {
  const stage = page.locator(".stage"),
    drawn = await drawnWithin(page, stage)

  expect(drawn).toBe(true)
}

// Where frames are slow two pictures taken in a row can be the same frame, so
// the stage is still only once this many in a row agree.
const STILL_PICTURES = 3

// The whole canvas, with nothing of the page over it.
function canvasOnly(page) {
  return page.screenshot({ style: ".showroom > :not(canvas) { visibility: hidden; }" })
}

async function stillPicture(take) {
  const pictures = []

  await expect
    .poll(async function () {
      const current = await take(),
        agreeing = pictures.filter(picture => picture.equals(current)).length

      pictures.splice(0, agreeing == pictures.length ? 0 : pictures.length)
      pictures.push(current)

      return pictures.length >= STILL_PICTURES
    }, SLOW_WAIT)
    .toBe(true)

  return pictures.at(-1)
}

// What the set-up's stage shows once its pieces have stopped moving.
function stillStage(page) {
  const stage = page.locator(".stage")

  return stillPicture(() => within(page, stage))
}

function errorsOf(page) {
  const errors = []

  page.on("pageerror", error => errors.push(error.message))

  return errors
}

test("the line-up draws every computer in a frame of its own", async function ({ page }) {
  await page.goto("/")
  await arrived(page)

  const items = page.locator(".line-up li[data-computer]"),
    names = await items.locator(".name").allTextContents()

  expect(names).toEqual(["ZX Spectrum 48K", "CPC 464", "CPC 664", "CPC 6128"])
  await expectDrawnInEvery(page, items)
})

test("a computer chosen is set up under an address of its own", async function ({ page }) {
  const errors = errorsOf(page)

  await page.goto("/")
  await arrived(page)
  await page.getByRole("link", { name: "CPC 464" }).click()
  await arrived(page)

  await expect(page).toHaveURL(/\?computer=cpc464$/u)
  await expect(page.getByRole("heading", { name: "Your English CPC 464" })).toBeFocused()
  await expect(page.locator(".line-up")).toBeHidden()
  await expectDrawnOnStage(page)
  expect(errors).toEqual([])
})

test("a computer is chosen from the keyboard as from the pointer", async function ({ page }) {
  await page.goto("/")
  await arrived(page)
  await page.getByRole("link", { name: "CPC 6128" }).focus()
  await page.keyboard.press("Enter")
  await arrived(page)

  await expect(page.getByRole("heading", { name: "Your English CPC 6128" })).toBeVisible()
})

test("all computers leads back to the line-up, to the computer left", async function ({ page }) {
  const errors = errorsOf(page)

  await page.goto("/")
  await arrived(page)
  await page.getByRole("link", { name: "CPC 464" }).click()
  await arrived(page)
  await page.getByRole("link", { name: "All computers" }).click()
  await arrived(page)

  const items = page.locator(".line-up li[data-computer]")

  await expect(page).toHaveURL(/\/$/u)
  await expect(page.locator(".set-up")).toBeHidden()
  await expect(page.getByRole("link", { name: "CPC 464" })).toBeFocused()
  await expectDrawnInEvery(page, items)
  expect(errors).toEqual([])
})

test("the browser's own Back and Forward travel between them", async function ({ page }) {
  const errors = errorsOf(page)

  await page.goto("/")
  await arrived(page)
  await page.getByRole("link", { name: "ZX Spectrum 48K" }).click()
  await arrived(page)
  await page.goBack()
  await arrived(page)

  await expect(page.locator(".line-up")).toBeVisible()
  await expect(page.locator(".set-up")).toBeHidden()

  await page.goForward()
  await arrived(page)

  await expect(page.getByRole("heading", { name: "Your ZX Spectrum 48K" })).toBeVisible()
  expect(errors).toEqual([])
})

test("Back pressed before the set-up arrives still ends in the line-up", async function ({ page }) {
  const errors = errorsOf(page)

  await page.goto("/")
  await arrived(page)
  await page.getByRole("link", { name: "CPC 464" }).click()
  // A computer under a resting pointer turns, and is drawn, for as long as it
  // rests there: where frames are slow that starves every picture taken.
  await page.mouse.move(0, 0)
  await page.goBack()
  await arrived(page)

  await expect(page).toHaveURL(/\/$/u)
  await expect(page.locator(".line-up")).toBeVisible()
  await expect(page.locator(".set-up")).toBeHidden()
  await expectDrawnInEvery(page, page.locator(".line-up li[data-computer]"))
  expect(errors).toEqual([])
})

test("an address naming a computer opens its set-up", async function ({ page }) {
  await page.goto("/?computer=spectrum48")
  await arrived(page)

  await expect(page.getByRole("heading", { name: "Your ZX Spectrum 48K" })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: /CRC-1001/u })).toBeChecked()
  await expectDrawnOnStage(page)
})

test("an address naming no computer it knows opens the line-up", async function ({ page }) {
  await page.goto("/?computer=amiga500")
  await arrived(page)

  await expect(page.locator(".line-up")).toBeVisible()
  await expect(page.locator(".set-up")).toBeHidden()
})

test("a piece chosen comes onto the desk and goes again, and the line says so", async function ({
  page
}) {
  await page.goto("/?computer=cpc464")
  await arrived(page)

  const line = page.locator(".panel > p"),
    drive = page.getByRole("checkbox", { name: /DDI-1/u }),
    before = await stillStage(page)

  await expect(line).toHaveText("with the GT64 green monitor")
  await drive.check()
  await expect(line).toHaveText("with the GT64 green monitor and the DDI-1 disc drive")

  const standing = await stillStage(page),
    came = !standing.equals(before)

  expect(came).toBe(true)
  await drive.uncheck()
  await expect(line).toHaveText("with the GT64 green monitor")

  const after = await stillStage(page),
    gone = after.equals(before)

  expect(gone).toBe(true)
})

test("a display chosen away and back stands as it stood", async function ({ page }) {
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const before = await stillStage(page)

  await page.getByRole("radio", { name: /GT65/u }).check()

  const other = await stillStage(page),
    changed = !other.equals(before)

  expect(changed).toBe(true)
  await page.getByRole("radio", { name: /CTM644/u }).check()

  const after = await stillStage(page),
    restored = after.equals(before)

  expect(restored).toBe(true)
})

test("a display chosen while a piece beside it is still coming troubles nothing", async function ({
  page
}) {
  const errors = errorsOf(page)

  await page.clock.install()
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const now = await page.evaluate(() => Date.now())

  await page.clock.pauseAt(now + 1000)
  await page.getByRole("checkbox", { name: /CRC-1001/u }).check()
  await page.clock.runFor(16)
  await page.getByRole("radio", { name: /GT65/u }).check()
  await page.clock.resume()
  await stillStage(page)

  expect(errors).toEqual([])
})

test("a piece taken away from the leads joining it troubles nothing", async function ({ page }) {
  const errors = errorsOf(page)

  await page.goto("/?computer=spectrum48")
  await arrived(page)
  await stillStage(page)
  await page.getByRole("checkbox", { name: /CRC-1001/u }).uncheck()
  await stillStage(page)

  expect(errors).toEqual([])
})

test("what a hand carries into its socket ends where it stands at once for a reader who would see less motion", async function ({
  page,
  context
}) {
  const quiet = await context.newPage()

  await quiet.emulateMedia({ reducedMotion: "reduce" })

  for (const { computer, choose } of [
    { computer: "cpc6128", choose: each => each.getByRole("radio", { name: /GT65/u }).check() },
    { computer: "cpc464", choose: each => each.getByRole("checkbox", { name: /DDI-1/u }).check() },
    {
      computer: "cpc664",
      choose: each => each.getByRole("checkbox", { name: /CRC-1001/u }).check()
    },
    {
      computer: "spectrum48",
      choose: async function (each) {
        const recorder = each.getByRole("checkbox", { name: /CRC-1001/u })

        await recorder.uncheck()
        await recorder.check()
      }
    }
  ]) {
    for (const each of [page, quiet]) {
      await each.goto(`/?computer=${computer}`)
      await arrived(each)
      await choose(each)
    }

    const carried = await stillStage(page),
      placed = await stillStage(quiet),
      same = carried.equals(placed)

    expect(same).toBe(true)
  }
})

// Where a press on the element lands, and how wide the element is.
async function middleOf(locator) {
  const { x, y, width, height } = await locator.boundingBox()

  return { x: x + width / 2, y: y + height / 2, width }
}

test("the desk turns while dragged, and stands as it stood once let go", async function ({ page }) {
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const before = await stillStage(page),
    { x, y, width } = await middleOf(page.locator(".stage"))

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + width / 4, y + width / 8)

  const turned = await stillStage(page),
    changed = !turned.equals(before)

  expect(changed).toBe(true)
  await page.mouse.up()

  const after = await stillStage(page),
    restored = after.equals(before)

  expect(restored).toBe(true)
})

test("a computer in the line-up turns while dragged, and the drag does not choose it, though the keyboard still does", async function ({
  page
}) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await arrived(page)

  const frame = page.locator("[data-computer='cpc464'] .frame"),
    name = page.locator("[data-computer='cpc464'] .name"),
    { x, y, width } = await middleOf(frame),
    over = await middleOf(name),
    picture = () => within(page, frame)

  await page.mouse.move(x, y)

  const shown = await stillPicture(picture)

  await page.mouse.down()
  await page.mouse.move(x + width / 4, y)

  const turned = await stillPicture(picture),
    changed = !turned.equals(shown)

  expect(changed).toBe(true)
  await page.mouse.move(over.x, over.y)
  await page.mouse.up()
  await page.mouse.move(x, y)

  const after = await stillPicture(picture),
    restored = after.equals(shown)

  expect(restored).toBe(true)
  await expect(page).not.toHaveURL(/computer=/u)
  await page.getByRole("link", { name: "CPC 464" }).press("Enter")
  await expect(page).toHaveURL(/computer=cpc464/u)
})

// The page's clock is held, so that the first frame after a choice is drawn
// alone: everything then stands where it set out from.
async function firstFrameAfter(page, choosing) {
  const before = await stillPicture(() => canvasOnly(page)),
    now = await page.evaluate(() => Date.now())

  await page.clock.pauseAt(now + 1000)
  await choosing()
  await page.clock.runFor(16)

  const first = await canvasOnly(page)

  await page.clock.resume()

  return { before, first }
}

test("a piece chosen comes in from beyond the edge of the screen, on either side", async function ({
  page
}) {
  const errors = errorsOf(page)

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.clock.install()
  await page.goto("/?computer=cpc464")
  await arrived(page)

  for (const control of [
    page.getByRole("checkbox", { name: /DDI-1/u }),
    page.getByRole("radio", { name: /CTM644/u })
  ]) {
    const { before, first } = await firstFrameAfter(page, () => control.check()),
      unseen = first.equals(before),
      after = await stillPicture(() => canvasOnly(page)),
      came = !after.equals(before)

    expect(unseen).toBe(true)
    expect(came).toBe(true)
  }

  expect(errors).toEqual([])
})

test("a computer sold in several languages offers each, and one sold in one offers none", async function ({
  page
}) {
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const languages = page.getByRole("group", { name: "Language" }),
    offered = await languages
      .getByRole("radio")
      .evaluateAll(radios => radios.map(radio => radio.value))

  expect(offered.length).toBeGreaterThan(1)
  await page.goto("/?computer=spectrum48")
  await arrived(page)
  await expect(page.getByRole("group", { name: "Language" })).toHaveCount(0)
})

// How a computer's French version is described where it is set up.
async function frenchVersionOf(page, computer) {
  await page.goto(`/?computer=${computer}`)
  await arrived(page)

  const french = page.getByRole("radio", { name: /French/u }),
    label = page.locator("label", { has: french })

  return label.textContent()
}

test("each version is described as its own computer wore it", async function ({ page }) {
  const qwerty = await frenchVersionOf(page, "cpc664"),
    azerty = await frenchVersionOf(page, "cpc6128")

  expect(qwerty).not.toEqual(azerty)
})

test("a language chosen letters the computer anew, and names it", async function ({ page }) {
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const before = await stillStage(page)

  await page.getByRole("radio", { name: /French/u }).check()
  await expect(page.getByRole("heading", { name: "Your French CPC 6128" })).toBeVisible()

  const lettered = await stillStage(page),
    changed = !lettered.equals(before)

  expect(changed).toBe(true)
  await page.getByRole("radio", { name: /English/u }).check()

  const after = await stillStage(page),
    restored = after.equals(before)

  expect(restored).toBe(true)
})

test.describe("for a reader of Spanish", function () {
  test.use({ locale: "es-ES" })

  test("a computer is set up first in the reader's own language", async function ({ page }) {
    await page.goto("/?computer=cpc464")
    await arrived(page)

    await expect(page.getByRole("heading", { name: "Your Spanish CPC 464" })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Spanish/u })).toBeChecked()
  })
})

test("switching on stands the desk chosen under an address of its own, and Back switches it off", async function ({
  page
}) {
  const errors = errorsOf(page),
    controls = page.locator("colophon-desk-controls")

  await page.goto("/?computer=cpc6128")
  await arrived(page)
  await page.getByRole("button", { name: "Switch on" }).click()
  await arrived(page)

  await expect(page).toHaveURL(/\?computer=cpc6128&language=en&monitor=ctm644$/u)
  await expect(controls).toBeFocused()
  await expect(page.getByRole("heading", { name: "Your English CPC 6128" })).toBeAttached()

  await page.goBack()
  await arrived(page)

  await expect(page).toHaveURL(/\?computer=cpc6128$/u)
  await expect(controls).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /CTM644/u })).toBeChecked()
  await expectDrawnOnStage(page)
  expect(errors).toEqual([])
})

test("an address naming a desk opens it switched on, and switching off sets it up as it stood", async function ({
  page
}) {
  await page.goto("/?computer=cpc6128&language=es&monitor=ctm644&recorder=crc1001")
  await arrived(page)
  await expect(page.locator("colophon-desk-controls")).toBeFocused()

  await page.getByRole("link", { name: "Switch off" }).click()
  await arrived(page)

  await expect(page).toHaveURL(/\?computer=cpc6128$/u)
  await expect(page.getByRole("heading", { name: "Your Spanish CPC 6128" })).toBeVisible()
  await expect(page.getByRole("radio", { name: /Spanish/u })).toBeChecked()
  await expect(page.getByRole("checkbox", { name: /CRC-1001/u })).toBeChecked()
})

test("a desk that does not start leaves its set-up standing, which says why", async function ({
  page
}) {
  const switchOn = page.getByRole("button", { name: "Switch on" })

  await page.route("**/*.rom", route => route.fulfill({ status: 404 }))
  await page.goto("/?computer=cpc6128")
  await arrived(page)
  await switchOn.click()
  await arrived(page)

  await expect(page).toHaveURL(/\?computer=cpc6128$/u)
  await expect(switchOn).toBeEnabled()
  await expect(switchOn).toHaveAccessibleDescription(
    /^The CPC 6128 did not start: .+ answered 404$/u
  )
  await expectDrawnOnStage(page)
})

test("a desk that does not run here cannot be switched on, and says why", async function ({
  page
}) {
  const switchOn = page.getByRole("button", { name: "Switch on" })

  await page.goto("/?computer=cpc464")
  await arrived(page)
  await expect(switchOn).toBeDisabled()
  await expect(switchOn).toHaveAccessibleDescription("The CPC 464 does not run here yet.")

  await page.goto("/?computer=cpc6128")
  await arrived(page)
  await expect(switchOn).toBeEnabled()
  await page.getByRole("radio", { name: /GT65/u }).check()
  await expect(switchOn).toBeDisabled()
  await expect(switchOn).toHaveAccessibleDescription(
    "The CPC 6128 does not run here with the GT65 yet."
  )
})

test("on a narrow screen the desk stands above its choices", async function ({ page }) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/?computer=cpc6128")
  await arrived(page)

  const stage = await page.locator(".stage").boundingBox(),
    panel = await page.locator(".panel").boundingBox()

  expect(stage.y + stage.height).toBeLessThanOrEqual(panel.y)
  await expectDrawnOnStage(page)
})

test("on a narrow screen a computer chosen far down the line-up is set up from the top, and found again on the way back", async function ({
  page
}) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await arrived(page)

  const link = page.getByRole("link", { name: "CPC 6128" })

  await link.scrollIntoViewIfNeeded()
  await link.click()
  await arrived(page)

  const stage = await page.locator(".stage").boundingBox()

  expect(stage.y).toBe(0)
  await page.getByRole("link", { name: "All computers" }).click()
  await arrived(page)
  await expect(link).toBeInViewport()
})

test("on a narrow screen a computer drawn keeps to its frame while the page scrolls, and is drawn there anew", async function ({
  page
}) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await arrived(page)

  const canvas = page.locator(".showroom > canvas"),
    frame = page.locator(".line-up li:last-child .frame"),
    canvasHandle = await canvas.elementHandle(),
    frameHandle = await frame.elementHandle(),
    [canvasMoved, frameMoved] = await page.evaluate(
      function ([canvasElement, frameElement]) {
        const canvasBefore = canvasElement.getBoundingClientRect().top,
          frameBefore = frameElement.getBoundingClientRect().top

        frameElement.scrollIntoView()

        const canvasAfter = canvasElement.getBoundingClientRect().top,
          frameAfter = frameElement.getBoundingClientRect().top

        return [canvasAfter - canvasBefore, frameAfter - frameBefore]
      },
      [canvasHandle, frameHandle]
    )

  expect(frameMoved).toBeLessThan(0)
  expect(canvasMoved).toBe(frameMoved)
  await expect.poll(async () => (await canvas.boundingBox()).y, SLOW_WAIT).toBe(0)

  const drawn = await drawnWithin(page, frame)

  expect(drawn).toBe(true)
})
