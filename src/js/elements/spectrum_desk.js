import { SPECTRUM_KEY_MATRIX, Spectrum } from "../emulator"
import DeskElement from "./desk"
import html from "../html"

const RECORDER_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="5" y="2" width="14" height="20" rx="1.5" />
  <rect x="8" y="9" width="8" height="5" rx="0.5" />
  <path d="M8 5h8M8 7h8M7 17h10M9.5 17v4M12 17v4M14.5 17v4" />
</svg>`

// The 48K before the white Trinitron Sinclair stood it in front of in its
// launch brochure: https://spectrumforeveryone.com/wp-content/uploads/2020/08/Spectrum-Brochure.pdf
// Sinclair named no recorder for it; the one beside it says in its own file
// why it is the one: tools/models/crc1001.js.
const MODELS = { machine: "spectrum48", monitor: "kv1400", recorder: "crc1001" }

// A 48K takes its tapes at the recorder beside it, each image alone or in an archive.
const RECORDER = {
  view: "recorder",
  title: "The cassette recorder",
  icon: RECORDER_ICON,
  noun: "tape",
  plural: "tapes",
  suffixes: [".tap", ".tzx"],
  place: "in the cassette recorder"
}

class SpectrumDeskElement extends DeskElement {
  get models() {
    return MODELS
  }

  get keyMatrix() {
    return SPECTRUM_KEY_MATRIX
  }

  // The browser's CONTROL is SYMBOL SHIFT here, held for nearly every mark of
  // punctuation.
  get sharesControl() {
    return false
  }

  createComputer(signal, anisotropy) {
    return Spectrum.create(signal, anisotropy)
  }

  slotOf({ recorder }) {
    return { slot: RECORDER, medium: recorder }
  }
}

SpectrumDeskElement.define("colophon-spectrum-desk")
