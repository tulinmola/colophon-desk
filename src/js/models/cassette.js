import { Box3, MathUtils, Vector3 } from "three/webgpu"
import Label from "./label"

// The tape passes the head at 4.76 cm/s [A], Philips Technical Review 31 (1970), "designed for a tape width of 3.81 mm and for a tape speed of 4.76 cm/s": https://www.musicaememoria.com/docs/PTechReview-31-1970-077.pdf
const MILLIMETRES_PER_MILLISECOND = 0.0476

// A C15 plays 7½ minutes a side [A], its own name; a tape recorded longer than that is wound on here as though its shell held it, which no CT-15 did.
const SIDE_MILLISECONDS = 7.5 * 60 * 1000

// No C15's tape was measured: it is taken 18 µm thick, as Philips gives a C60's [A], Table I, ibid.
const TAPE_THICKNESS = 0.018

const MILLIMETRES_PER_METRE = 1000

// A pack wound round a hub of radius r to radius R holds π(R² - r²)/t of tape, so it stands at √(r² + Lt/π) when a length L is wound on; and the hub has turned (R - r)/t times.
function packRadius(hub, wound) {
  return Math.sqrt(hub * hub + (wound * TAPE_THICKNESS) / Math.PI)
}

function woundOn(hub, radius) {
  return (Math.PI * (radius * radius - hub * hub)) / TAPE_THICKNESS
}

function radiusOf(object) {
  const bounds = new Box3().setFromObject(object),
    size = new Vector3()

  bounds.getSize(size)

  return (size.x / 2) * MILLIMETRES_PER_METRE
}

export default class Cassette {
  model
  #drawnPackRadius
  #hubRadius
  #hubs
  #label
  #packs
  #playingTime = SIDE_MILLISECONDS

  constructor(model) {
    const label = model.getObjectByName("label"),
      left = { hub: model.getObjectByName("left-hub"), pack: model.getObjectByName("left-pack") },
      right = { hub: model.getObjectByName("right-hub"), pack: model.getObjectByName("right-pack") }

    model.updateWorldMatrix(true, true)

    this.model = model
    this.#label = new Label(label)
    this.#hubs = [left.hub, right.hub]
    this.#packs = [left.pack, right.pack]
    this.#hubRadius = radiusOf(left.hub)
    this.#drawnPackRadius = radiusOf(left.pack)
    this.turn(0)
    model.visible = false
  }

  // A cassette offered is a C15 wound to its start until the machine says what is recorded on it.
  write(filename) {
    this.#label.write(filename)
    this.wind(0)
    this.model.visible = true
  }

  erase() {
    this.#label.erase()
  }

  // How long the tape on it runs, which is a side of a C15 unless what was recorded runs longer.
  wind(recorded) {
    this.#playingTime = Math.max(SIDE_MILLISECONDS, recorded)
    this.turn(0)
  }

  // How long the tape on it plays, in milliseconds.
  get playingTime() {
    return this.#playingTime
  }

  // How many times the left hub has turned since the tape's start: the deck's counter is driven from the spindle under it.
  leftTurns(position) {
    const { supply } = this.#reels(position)

    return supply.turns
  }

  // Where the tape stands once the reel taking it up has turned so many more times: the right one going on, the left one, turned back, going back.
  positionAfter(position, turns) {
    const hub = this.#hubRadius,
      { supply, takeUp } = this.#reels(position),
      whole = this.#playingTime * MILLIMETRES_PER_MILLISECOND,
      onward = turns > 0,
      along = onward
        ? woundOn(hub, takeUp.radius + turns * TAPE_THICKNESS)
        : whole - woundOn(hub, supply.radius - turns * TAPE_THICKNESS),
      held = MathUtils.clamp(along, 0, whole)

    return held / MILLIMETRES_PER_MILLISECOND
  }

  // The reels as the tape stands at a place along it. The reel it plays off turns anticlockwise seen from the label [A], ECMA-34 5.3.6: "looking at label A, the tape is unwound in an anticlockwise direction": https://ecma-international.org/wp-content/uploads/ECMA-34_3rd_edition_september_1976.pdf; the reel winding it on turns the same way [E].
  turn(position) {
    const { supply, takeUp } = this.#reels(position),
      reels = [supply, takeUp]

    for (const [side, reel] of reels.entries()) {
      const pack = this.#packs[side],
        scale = reel.radius / this.#drawnPackRadius

      this.#hubs[side].rotation.y = reel.turns * 2 * Math.PI
      pack.scale.set(scale, 1, scale)
    }
  }

  #reels(position) {
    const hub = this.#hubRadius,
      whole = this.#playingTime * MILLIMETRES_PER_MILLISECOND,
      held = MathUtils.clamp(position, 0, this.#playingTime),
      along = held * MILLIMETRES_PER_MILLISECOND,
      full = packRadius(hub, whole),
      supplied = packRadius(hub, whole - along),
      taken = packRadius(hub, along)

    return {
      supply: { radius: supplied, turns: (full - supplied) / TAPE_THICKNESS },
      takeUp: { radius: taken, turns: (taken - hub) / TAPE_THICKNESS }
    }
  }
}
