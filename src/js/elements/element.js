export default class Element extends HTMLElement {
  #teardown = null

  static define(name) {
    customElements.define(name, this)
  }

  get signal() {
    return this.#teardown.signal
  }

  connectedCallback() {
    this.#teardown = new AbortController()
    this.init()
  }

  disconnectedCallback() {
    this.#teardown.abort()
    this.dispose()
  }
}
