import { expect, test } from "@playwright/test"
import { blank } from "./desk_scene.js"
import { resolve } from "node:path"

const FIRMWARE = "/js/emulator/firmware.js",
  PROBE = resolve(import.meta.dirname, "picture_probe.js")

const CPC6128_BYTES = 0x8000,
  CPC464_BYTES = 0x8000,
  SPECTRUM48_BYTES = 0x4000,
  PART_BYTES = 0x4000

// Two hardware colour codes far enough apart that no filtering could confuse
// them, and what an eight-bit channel may lose crossing sRGB and back.
const TOP_CODE = 26,
  BOTTOM_CODE = 4,
  ROUNDING = 3

// Pastel magenta and bright green, firmware colours 17 and 18, which a grey
// weighed by the eye's own luma puts the other way round.
const PASTEL_MAGENTA = 15,
  BRIGHT_GREEN = 18

function fetchImage(page, name) {
  return page.evaluate(
    async function ([url, image]) {
      const { default: fetchFirmware } = await import(url)

      try {
        const bytes = await fetchFirmware(image)

        return { length: bytes.length }
      } catch (problem) {
        return { refused: problem.message }
      }
    },
    [FIRMWARE, name]
  )
}

test("an image that is not what it is pinned to is refused", async function ({ page }) {
  await blank(page)
  await page.route("**/*.rom", function (route) {
    return route.fulfill({ body: Buffer.alloc(PART_BYTES) })
  })

  const answer = await fetchImage(page, "cpc6128es")

  expect(answer.refused).toContain("is pinned to")
})

test("an image once fetched is kept, and answers when its sources do not", async function ({
  page
}) {
  await blank(page)

  const fetched = await fetchImage(page, "cpc6128es")

  await page.route("**/*.rom", function (route) {
    return route.abort()
  })

  const kept = await fetchImage(page, "cpc6128es")

  expect(fetched.length).toBe(CPC6128_BYTES)
  expect(kept.length).toBe(CPC6128_BYTES)
})

test("the Spanish 464's firmware answers to its pin", async function ({ page }) {
  await blank(page)

  const fetched = await fetchImage(page, "cpc464es")

  expect(fetched.length).toBe(CPC464_BYTES)
})

test("the 48K's firmware answers to its pin", async function ({ page }) {
  await blank(page)

  const fetched = await fetchImage(page, "spectrum48")

  expect(fetched.length).toBe(SPECTRUM48_BYTES)
})

test("a colour code reaches the glass as the Gate Array's own colour, top at the top", async function ({
  page
}) {
  await blank(page)

  const lit = await page.evaluate(
    async function ([url, codes]) {
      const { default: readPicture } = await import(url)

      return readPicture(...codes)
    },
    [`/@fs${PROBE}`, [TOP_CODE, BOTTOM_CODE]]
  )

  expect(lit.wantTop).not.toEqual(lit.wantBottom)

  for (let channel = 0; channel < 3; channel++) {
    expect(Math.abs(lit.top[channel] - lit.wantTop[channel])).toBeLessThanOrEqual(ROUNDING)
    expect(Math.abs(lit.bottom[channel] - lit.wantBottom[channel])).toBeLessThanOrEqual(ROUNDING)
  }
})

test("a green monitor takes each code as one level, in the order the 464's manual gives its greys", async function ({
  page
}) {
  await blank(page)

  const lit = await page.evaluate(
      async function ([url, codes]) {
        const { default: readPicture } = await import(url)

        return readPicture(...codes)
      },
      [`/@fs${PROBE}`, [PASTEL_MAGENTA, BRIGHT_GREEN, "LUM"]]
    ),
    levels = [lit.top, lit.bottom]

  for (const [red, green, blue] of levels) {
    expect(Math.abs(red - green)).toBeLessThanOrEqual(ROUNDING)
    expect(Math.abs(blue - green)).toBeLessThanOrEqual(ROUNDING)
  }

  expect(lit.bottom[1]).toBeGreaterThan(lit.top[1] + ROUNDING)
})
