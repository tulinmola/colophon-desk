import { expect, test } from "@playwright/test"
import profileShader from "./profile_shader.js"

test("the generated screen shader keeps the cost it was recorded with", async function ({ page }) {
  const probe = `/@fs${import.meta.dirname}/screen_probe.js`

  await page.route("**/shader-cost", function (route) {
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html></html>" })
  })
  await page.goto("/shader-cost")

  const fragment = await page.evaluate(async function (url) {
      const { default: createScreen } = await import(url),
        screen = await createScreen({ forceWebGL: true })

      await screen.render(0.03)

      const shader = await screen.shader()

      screen.dispose()

      return shader.fragmentShader
    }, probe),
    profile = profileShader(fragment),
    recorded = JSON.stringify(profile, null, 2)

  expect(recorded).toMatchSnapshot("screen-shader.json")
})
