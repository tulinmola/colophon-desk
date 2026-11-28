// A worklet module is fetched under the page's own policy, which may refuse
// one inlined as a data: URL, so the processor ships as a file of its own,
// found beside the module wherever that is served from.
const PROCESSOR = "colophon-amplifier",
  PROCESSOR_URL = new URL("./amplifier_processor.js?no-inline", import.meta.url)

// However many desks a page holds, it plays through one context, at the
// device's own rate.
let context = null,
  processorLoaded = null

function sharedContext() {
  if (context == null) {
    context = new AudioContext()
    processorLoaded = context.audioWorklet.addModule(PROCESSOR_URL)
  }

  return context
}

// What a machine sounds while it runs, played from the first press a page
// allows sound after, for as long as it is on.
export default class Amplifier {
  #closing = new AbortController()
  #connecting = false
  #listening = false
  #machine
  #node = null
  #on = true
  #spare = []

  constructor(machine) {
    const { signal } = this.#closing,
      wake = () => this.#wake()

    this.#machine = machine

    // Caught on the way down, so that a page stopping a press on its way does
    // not keep it from the sound; a touch is a press only once it is let go.
    addEventListener("keydown", wake, { signal, capture: true })
    addEventListener("pointerup", wake, { signal, capture: true })
    this.#wake()
  }

  get on() {
    return this.#on
  }

  set on(on) {
    this.#on = on
    this.#wake()
  }

  // What the machine sounded in its last run goes to the sound card, and
  // whether its next is heard is settled: a machine switched off falls silent,
  // and one switched on again is heard from its first level, not the last one
  // of the machine before it.
  advance() {
    const machine = this.#machine,
      node = this.#node,
      heard = this.#on && machine.running && node != null && context.state == "running",
      starting = heard && !this.#listening,
      stopping = !heard && this.#listening

    this.#deliver()

    if (starting) {
      machine.listen(context.sampleRate)
      node.port.postMessage({ kind: "begin" })
      this.#listening = true
    }

    if (stopping) {
      machine.stopListening()
      this.#listening = false
    }
  }

  close() {
    const node = this.#node

    this.#closing.abort()

    if (node) {
      node.port.postMessage({ kind: "end" })
      node.disconnect()
    }
  }

  onReturned({ samples, adjustment }) {
    this.#spare.push(samples)

    if (this.#listening) {
      const rate = context.sampleRate * adjustment

      this.#machine.setListeningRate(rate)
    }
  }

  // A context made on a page not yet pressed is refused, with a warning on the
  // console. Not every key is a press: Escape is not, by HTML's
  // activation-triggering input events
  // (https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event),
  // and Chromium and Firefox leave out a modifier alone as well.
  #wake() {
    const pressed = navigator.userActivation.hasBeenActive,
      waking = this.#on && pressed

    if (!waking) {
      return
    }

    const shared = sharedContext()

    if (!this.#connecting) {
      this.#connecting = true
      this.#connect()
    }

    shared.resume()
  }

  async #connect() {
    await processorLoaded

    const closed = this.#closing.signal.aborted

    if (closed) {
      return
    }

    const options = { numberOfInputs: 0, outputChannelCount: [2] },
      node = new AudioWorkletNode(context, PROCESSOR, options)

    node.port.onmessage = event => this.onReturned(event.data)
    node.connect(context.destination)
    this.#node = node
  }

  #deliver() {
    if (!this.#listening) {
      return
    }

    const heard = this.#machine.hear(),
      silent = heard.length == 0

    if (silent) {
      return
    }

    const spare = this.#spare.pop(),
      roomy = spare != null && spare.length >= heard.length,
      samples = roomy ? spare : new Float32Array(heard.length),
      message = { kind: "samples", samples, length: heard.length }

    samples.set(heard)
    this.#node.port.postMessage(message, [samples.buffer])
  }
}
