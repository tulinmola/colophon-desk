import Element from "./element"

const html = String.raw

const GEAR = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <path
    d="M9.35 5.09L9.75 2.26L14.25 2.26L14.65 5.09L16.66 6.25L19.31 5.18L21.56 9.08L19.31 10.84L19.31 13.16L21.56 14.92L19.31 18.82L16.66 17.75L14.65 18.91L14.25 21.74L9.75 21.74L9.35 18.91L7.34 17.75L4.69 18.82L2.44 14.92L4.69 13.16L4.69 10.84L2.44 9.08L4.69 5.18L7.34 6.25Z"
  />
  <circle cx="12" cy="12" r="3" />
</svg>`

class OptionsElement extends Element {
  #bindings = new Map()
  #settings

  init() {
    this.innerHTML = html`
      <button type="button" name="options" title="Options" aria-expanded="false">${GEAR}</button>
      <aside aria-label="Options" hidden>
        <form>
          <p>These figures are provisional, the tube's and the keys' alike. Turn them.</p>
          <label class="switch">
            <input name="enabled" type="checkbox" /> Phosphors and scanlines
          </label>
          <label>
            Phosphor pitch (mm)<output aria-hidden="true"></output>
            <input name="phosphorPitch" type="range" min="0.4" max="1.2" step="0.01" />
          </label>
          <label>
            Slot row pitch (mm)<output aria-hidden="true"></output>
            <input name="slotPitch" type="range" min="0.4" max="1.2" step="0.01" />
          </label>
          <label>
            Scanline width (of a line)<output aria-hidden="true"></output>
            <input name="scanlineWidth" type="range" min="0.2" max="0.45" step="0.01" />
          </label>
          <label>
            Horizontal spot spread (mm)<output aria-hidden="true"></output>
            <input name="excitationWidth" type="range" min="0" max="0.5" step="0.01" />
          </label>
          <label>
            Picture glow<output aria-hidden="true"></output>
            <input name="glow" type="range" min="0" max="1" step="0.05" />
          </label>
          <label>
            Glow radius (mm)<output aria-hidden="true"></output>
            <input name="glowRadius" type="range" min="0.1" max="1" step="0.01" />
          </label>
          <label class="switch">
            <input name="compensation" type="checkbox" /> Compensate mask brightness
          </label>
          <label>
            Light level<output aria-hidden="true"></output>
            <input name="light" type="range" min="0.1" max="1" step="0.05" />
          </label>
          <label>
            Picture width<output aria-hidden="true"></output>
            <input name="pictureWidth" type="range" min="0.7" max="1.3" step="0.01" />
          </label>
          <label>
            Picture height<output aria-hidden="true"></output>
            <input name="pictureHeight" type="range" min="0.7" max="1.3" step="0.01" />
          </label>
          <label>
            Horizontal position<output aria-hidden="true"></output>
            <input name="pictureX" type="range" min="-0.15" max="0.15" step="0.001" />
          </label>
          <label>
            Vertical position<output aria-hidden="true"></output>
            <input name="pictureY" type="range" min="-0.15" max="0.15" step="0.001" />
          </label>
          <label>
            Key travel (mm)<output aria-hidden="true"></output>
            <input name="keyTravel" type="range" min="0" max="6" step="0.1" />
          </label>
          <button type="button" name="direct">Direct phosphor light</button>
          <button type="reset">Reset</button>
        </form>
      </aside>
    `

    const { signal } = this

    this.addEventListener("input", this.onAdjusted, { signal })
    this.addEventListener("reset", this.onReset, { signal })
    this.addEventListener("click", this.onClicked, { signal })
  }

  dispose() {
    this.#settings = null
    this.#bindings.clear()
    this.replaceChildren()
    this.hidden = true
  }

  use(settings) {
    this.#settings = settings
    this.#bindings.clear()

    for (const input of this.querySelectorAll("input")) {
      const node = settings[input.name]

      this.#bindings.set(input, { node, initial: node.value })
      this.#show(input, node.value)
    }

    this.hidden = false
  }

  #show(input, value) {
    const checkbox = input.type == "checkbox"

    if (checkbox) {
      input.checked = Boolean(value)
    } else {
      const readout = input.parentElement.querySelector("output")

      input.value = value
      readout.textContent = input.value
    }
  }

  onAdjusted(event) {
    const input = event.target,
      { node } = this.#bindings.get(input),
      checkbox = input.type == "checkbox"

    node.value = checkbox ? Number(input.checked) : input.valueAsNumber
    this.#show(input, node.value)
  }

  onClicked(event) {
    const button = event.target.closest("button")

    switch (button?.name) {
      case "options":
        this.#toggle(button)
        break
      case "direct":
        this.#showDirectLight()
        break
      default:
        break
    }
  }

  #toggle(button) {
    const aside = this.querySelector("aside"),
      opening = aside.hidden

    aside.hidden = !opening
    button.setAttribute("aria-expanded", String(opening))
  }

  #showDirectLight() {
    const settings = this.#settings

    settings.excitationWidth.value = 0
    settings.glow.value = 0
    settings.compensation.value = 0
    settings.light.value = 1
    settings.enabled.value = 1

    for (const [input, { node }] of this.#bindings) {
      this.#show(input, node.value)
    }
  }

  onReset(event) {
    event.preventDefault()

    for (const [input, { node, initial }] of this.#bindings) {
      node.value = initial
      this.#show(input, initial)
    }
  }
}

OptionsElement.define("colophon-options")
