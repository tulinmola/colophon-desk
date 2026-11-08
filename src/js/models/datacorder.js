import { MathUtils, Vector3 } from "three/webgpu"
import CassetteDeck from "./cassette_deck"

// The six keys, named as the service manual names them [A], CPC464 Service Manual p2, Record, Play, Rewind, Fast Forward, Stop/Eject and Pause, 170015 to 170020: https://archive.org/details/Amstrad_CPC464_Service_Manual_1985_Amstrad_Consumer_Electronics
const KEYS = {
    record: "record-key",
    play: "play-key",
    rewind: "rewind-key",
    fastForward: "fast-forward-key",
    stop: "stop-eject-key",
    pause: "pause-key"
  },
  RESET_LEVER = "reset-lever"

// A key turns nose down on its lever's rod: 19° held down and 15° latched, read on two photographs of PLAY, one held by a finger and one latched beside keys at rest [E]: https://i.ytimg.com/vi/aC0WpCXMPno/maxresdefault.jpg and https://i.ytimg.com/vi/Dv6iysaQK2I/maxresdefault.jpg. Only PLAY was read: REC, REW, F.F., STOP/EJECT and PAUSE are taken to travel as far.
const PRESSED = MathUtils.degToRad(19),
  LATCHED = MathUtils.degToRad(15)

// The lid opens 28.5° to a stop, with or without a cassette in it, on the museum's photographs from one tripod, shut and open, through a camera calibrated on the prints [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(16).jpg
const OPEN_LID = MathUtils.degToRad(28.5)

// How far in front of the holder a cassette is brought before it slides in, in metres, is a presentation choice.
const MOUTH = 0.075

// The counter counts 0.8 for each turn of the left spindle, the reel the tape plays off [E]: the counter numbers Loriciels' Pharaon gives for its own blocks, in its French and its Spanish release, fit the turns of that reel to within a count, and those of the other reel no closer than 8. The figure rests on the tape being a C60's usual 16 to 18 µm and on the standard's hub, 21.7 across, neither of which any source gives for those tapes: https://www.cpc-power.com/index.php?page=protection&lenom=COMPTEUR%20CASSETTE
const COUNTS_PER_TURN = 0.8

const FIGURES = {
  keys: KEYS,
  reset: RESET_LEVER,
  pressed: PRESSED,
  latched: LATCHED,
  openLid: OPEN_LID,
  approach: new Vector3(0, 0, MOUTH),
  countsPerTurn: COUNTS_PER_TURN
}

// The 464's own datacorder, built into the machine beside its keyboard.
// What each key does is the user instructions' [A], ch. 2: https://archive.org/details/cpc464.en. PLAY, REW and F.F. latch, and STOP/EJECT releases them, "and reset all the cassette operation keys to the original state. If the key is released and then pressed again, the cassette lid will open." PAUSE stays down on its own, "check that the [PAUSE] key has not been accidentally pressed down", and is pressed on and pressed off.
// Pressing one of PLAY, REW and F.F. while another is down releases it, as the one locking plate behind them would, and PAUSE, which has a lock plate of its own, stays as it stands through STOP/EJECT [A], the service manual's parts, ibid., "Locking Plate 170206" and "Pause Lock Plate 809168"; how the plates behave is read from those parts, and is a guess.
export default class Datacorder extends CassetteDeck {
  // The parts a reader works: the lid a cassette goes in at, the keys and the counter's lever.
  static PARTS = ["cassette-lid", ...Object.values(KEYS), RESET_LEVER]

  constructor(machine, cassette, cpc) {
    super(machine, cassette, cpc, FIGURES)
  }

  // The motor runs off the computer's own supply, so nothing turns while it is switched off.
  powered(cpc) {
    return cpc.running
  }

  // At the tape's end a trip in the mechanism lets PLAY up [A], ch. 2: "Both the [REC] and [PLAY] keys are reset by a mechanical trip in the mechanism when the cassette tape reaches its end." F.F. and REW stall there instead.
  tripped(cpc, position, length) {
    return position >= length
  }
}
