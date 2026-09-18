import Element from "./element"

const html = String.raw

class OptionsElement extends Element {
  #bindings = new Map()
  #settings

  init() {
    this.innerHTML = html`
      <details>
        <summary>Options</summary>
        <form>
          <p>The tube's figures are provisional. Turn them.</p>
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
          <button type="button" name="direct">Direct phosphor light</button>
          <button type="reset">Reset</button>
        </form>
      </details>
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
    const direct = event.target.name == "direct"

    if (direct) {
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
