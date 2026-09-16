export class Element extends HTMLElement {
  static define(name) {
    customElements.define(name, this)
  }

  connectedCallback() {
    this.init()
  }

  disconnectedCallback() {
    this.dispose()
  }
}
