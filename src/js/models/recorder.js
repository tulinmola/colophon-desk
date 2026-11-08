import { MathUtils, Vector3 } from "three/webgpu"
import CassetteDeck from "./cassette_deck"

// The six keys, named as their own legends name them, RECORD, PLAY, REWIND, ADVANCE, STOP/EJ. and PAUSE, and the counter's reset button: tools/models/crc1001.js.
const KEYS = {
    record: "record-key",
    play: "play-key",
    rewind: "rewind-key",
    fastForward: "advance-key",
    stop: "stop-eject-key",
    pause: "pause-key"
  },
  RESET_BUTTON = "reset-button"

// A key turns nose down on a pivot no photograph shows, and the pivot drawn is a guess, tools/models/crc1001.js; 6° is where a key's nose meets the ledge below it there. It is taken to latch at 4.5°, three quarters of that, as the 464's PLAY latches at about three quarters of its travel: a guess.
const PRESSED = MathUtils.degToRad(6),
  LATCHED = MathUtils.degToRad(4.5)

// The lid stands open at 46° ±3 on the YOKO seen from its side, where it foreshortens to 0.70 of its length shut [E]: https://antique-autoradio-madness.org/Mini-k7/mini-k7-portables/(P)Yoko-CRC-1001/K7-(P)Yoko-CRC-1001_11aam.jpg. Whether that is as far as it opens is not shown.
const OPEN_LID = MathUtils.degToRad(46)

// A cassette is let down into the well from 0.01 above its seat and 0.003 toward the keys, in metres, which clears the open lid and the well's front wall on the way down in the model's figures. A hand tilts a cassette in back edge first; the page lets it down level, a presentation choice.
const APPROACH = new Vector3(0, 0.01, 0.003)

// What the counter counts for each turn of the left spindle is measured on no CRC-1001: the 464's 0.8 is taken for it, a guess.
const COUNTS_PER_TURN = 0.8

const FIGURES = {
  keys: KEYS,
  reset: RESET_BUTTON,
  pressed: PRESSED,
  latched: LATCHED,
  openLid: OPEN_LID,
  approach: APPROACH,
  countsPerTurn: COUNTS_PER_TURN
}

// The Computone CRC-1001, standing on the desk beside a machine with no deck of its own and running on a supply of its own.
// How its keys behave is documented nowhere: its six keys and STOP/EJ.'s name are its own, tools/models/crc1001.js, and that they latch, release and open the lid as the 464's do is a guess.
export default class Recorder extends CassetteDeck {
  // The parts a reader works: the lid a cassette goes in at, the keys and the counter's reset.
  static PARTS = ["cassette-lid", ...Object.values(KEYS), RESET_BUTTON]

  model

  constructor(model, cassette, spectrum) {
    super(model, cassette, spectrum, FIGURES)
    this.model = model
  }

  // PLAY is let up where the image marks a stop, as an emulator stops a tape there, and at the tape's end, where the AUTO STOP printed on the lid lets it up.
  tripped(spectrum, position, length) {
    const marked = spectrum.tapeAtMark(),
      ended = position >= length

    return marked || ended
  }
}
