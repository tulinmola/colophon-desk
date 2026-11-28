import { expect, test } from "@playwright/test"
import { blank } from "./desk_scene.js"
import { resolve } from "node:path"

const FIRMWARE = "/js/emulator/firmware.js",
  PROBE = resolve(import.meta.dirname, "picture_probe.js"),
  MACHINE_PROBE = resolve(import.meta.dirname, "machine_probe.js")

const CPC6128_BYTES = 0x8000,
  PART_BYTES = 0x4000

// Two hardware colour codes far enough apart that no filtering could confuse
// them, and what an eight-bit channel may lose crossing sRGB and back.
const TOP_CODE = 26,
  BOTTOM_CODE = 4,
  ROUNDING = 3

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

// The 6128's SOUND 1,142 turns channel A over every 1,136 microseconds, a whole
// wave at 440.14Hz, and A joins the socket's left side and not its right:
// colophon-emulator's docs/evidence.en.md and cpc_sound_socket. The machine is
// heard at a rate chosen here.
const SOUND_1_142_300 = [
    "KeyS",
    "KeyO",
    "KeyU",
    "KeyN",
    "KeyD",
    "Space",
    "Digit1",
    "Comma",
    "Digit1",
    "Digit4",
    "Digit2",
    "Comma",
    "Digit3",
    "Digit0",
    "Digit0",
    "Enter"
  ],
  NOTE_HERTZ = 440.14,
  HEARD_RATE = 48000

test("a note the firmware plays is heard on the socket's left side alone, at its pitch", async function ({
  page
}) {
  await blank(page)

  const { left, right } = await page.evaluate(
    async function ([url, codes, rate]) {
      const { default: machineAtPrompt } = await import(url),
        { cpc, run, type } = await machineAtPrompt("en"),
        sides = [[], []]

      type(codes)
      cpc.listen(rate)

      for (let frame = 0; frame < 50; frame++) {
        run(20)

        const heard = cpc.hear()

        for (let at = 0; at < heard.length; at += 2) {
          sides[0].push(heard[at])
          sides[1].push(heard[at + 1])
        }
      }

      cpc.dispose()

      return { left: sides[0], right: sides[1] }
    },
    [`/@fs${MACHINE_PROBE}`, SOUND_1_142_300, HEARD_RATE]
  )

  const [first] = right,
    middle = (Math.min(...left) + Math.max(...left)) / 2

  let rises = 0

  for (let at = 1; at < left.length; at++) {
    const rose = left[at - 1] < middle && left[at] >= middle

    if (rose) {
      rises++
    }
  }

  const seconds = left.length / HEARD_RATE

  expect(right.every(sample => sample == first)).toBe(true)
  expect(rises / seconds / NOTE_HERTZ).toBeCloseTo(1, 2)
})
