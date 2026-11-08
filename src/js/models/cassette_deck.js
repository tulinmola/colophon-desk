import { MeshStandardNodeMaterial, Quaternion, RepeatWrapping, Vector3 } from "three/webgpu"
import { texture, uniform, uv, vec2 } from "three/tsl"
import REDUCED_MOTION from "./reduced_motion"

// How fast a key travels, a lid swings and a cassette is carried, in milliseconds, and how high it is lifted off the desk, in metres, are presentation choices. No damper is among the 464's lid's parts, nor seen on the Computone's, so a lid springs up quickly.
const KEY_TRAVEL = 120,
  LID_OPENING = 180,
  LID_CLOSING = 420,
  LIFT = 360,
  CARRY = 520,
  SLIDE = 420,
  LIFTED = 0.06

// How fast F.F. and REW wind is measured on neither deck here. A deck of the time winds a C60's side in about 90 seconds [A], "Approx. 90 sec. (with C-60)": https://www.manualslib.com/manual/3312455/Sony-Tc-U30.html?page=12, which turns the winding spindle about 8 times a second [E]; that speed is a guess here, held whatever the pack, so the tape runs faster as it piles up.
const WINDING_TURNS_PER_MILLISECOND = 0.008

const FIGURES = 10,
  WHEELS = ["counter-units", "counter-tens", "counter-hundreds"]

function poseOf(object) {
  const position = new Vector3(),
    quaternion = new Quaternion(),
    scale = new Vector3()

  object.updateWorldMatrix(true, false)
  object.matrixWorld.decompose(position, quaternion, scale)

  return { position, quaternion }
}

function smoothed(progress) {
  return progress * progress * (3 - 2 * progress)
}

// A counter's wheel turns on its own a figure at a time; each one past the first is carried on only as the wheel before it rolls from 9 to 0.
function wheelFigures(count) {
  const figures = []

  for (let wheel = 0; wheel < WHEELS.length; wheel++) {
    const unit = FIGURES ** wheel,
      whole = Math.floor(count / unit),
      below = count - whole * unit,
      carrying = Math.max(0, below - (unit - 1)),
      turned = whole + carrying

    figures.push(((turned % FIGURES) + FIGURES) % FIGURES)
  }

  return figures
}

// A wheel's print is its ten figures down a strip, and the window shows a figure's height of it, from as far down as the wheel has turned. That the figures roll up the window as they count up is a guess.
function rollingWheel(deck, name) {
  const wheel = deck.getObjectByName(name),
    { map, roughness, metalness } = wheel.material,
    turned = uniform(0),
    across = uv().x,
    down = uv().y.add(turned).div(FIGURES),
    figure = vec2(across, down),
    material = new MeshStandardNodeMaterial({ roughness, metalness })

  map.wrapT = RepeatWrapping
  map.needsUpdate = true
  material.colorNode = texture(map, figure)
  wheel.material.dispose()
  wheel.material = material

  return turned
}

// A cassette deck of piano keys over one locking plate, a lid that springs up when STOP/EJECT is pressed with nothing down, and a counter turned by the spindle the tape plays off, as the decks here are; each says where its own account of them comes from. PLAY, REW and F.F. latch, and pressing one while another is down releases it; STOP/EJECT releases what is down; REC goes down and comes back, since it works only held with PLAY, which a single pointer cannot do; PAUSE is pressed on and pressed off.
// Each deck brings its own parts and figures: `keys`, its part for each of record, play, rewind, fastForward, stop and pause; `reset`, the counter's reset; `pressed` and `latched`, how far a key turns held and latched, in radians; `openLid`, how far the lid opens, in radians; `approach`, where a hand brings a cassette before it goes in, in the seat's own frame and metres; and `countsPerTurn`, what the counter counts for each turn of the left spindle. It says, given the machine it plays into, whether its motor has its supply, and whether the mechanism lets PLAY up with the tape standing where it does on a tape so long.
export default class CassetteDeck {
  // The room the machine gives a tape, which an image must stand inside.
  capacity

  #angles = new Map()
  #arrived = false
  #cassette
  #computer
  #count = 0
  #engaged = false
  #figures
  #held = new Map()
  #journey = []
  #keys = new Map()
  #last = null
  #latched = new Set()
  #leftTurns = 0
  #lid
  #loaded = false
  #position = 0
  #rest
  #scene
  #seat
  #seated = false
  #started = null
  #travelling
  #wheelTurns
  #winding

  constructor(deck, cassette, computer, figures) {
    const { keys } = figures

    this.capacity = computer.tapeCapacity
    this.#cassette = cassette
    this.#computer = computer
    this.#figures = figures
    this.#lid = deck.getObjectByName("cassette-lid")
    this.#seat = deck.getObjectByName("cassette-seat")
    this.#scene = cassette.model.parent
    this.#rest = poseOf(cassette.model)
    this.#wheelTurns = WHEELS.map(name => rollingWheel(deck, name))
    this.#travelling = [keys.play, keys.rewind, keys.fastForward]
    this.#winding = { [keys.rewind]: -1, [keys.fastForward]: 1 }

    for (const name of Object.values(keys)) {
      const key = deck.getObjectByName(name)

      this.#keys.set(name, { key, rest: key.rotation.x })
      this.#angles.set(name, 0)
    }

    this.#showCounter()
  }

  // A cassette is carried by hand, so the deck takes no other while one is on its way.
  get carrying() {
    return this.#journey.length > 0
  }

  powered() {
    return true
  }

  tripped() {
    return false
  }

  // What a click on one of the deck's parts asks of it: a key pressed or the counter reset.
  answers(name) {
    const { keys, reset } = this.#figures,
      pressed = Object.values(keys).includes(name),
      resetting = name == reset

    if (pressed) {
      return "press"
    }

    return resetting ? "reset" : null
  }

  // A cassette offered while one is in takes its own place, as the disc does; STOP/EJECT first lets up whatever is down, as the reader would have to press it.
  insert(filename) {
    const swapping = this.#seated,
      outward = swapping ? this.#outward() : this.#opening(),
      writing = { milliseconds: 0, end: () => this.#cassette.write(filename) },
      releasing = { milliseconds: KEY_TRAVEL, begin: () => this.#releaseAll() },
      down = this.#anyDown(),
      first = down ? [releasing] : []

    this.#travel([...first, ...outward, writing, ...this.#inward()])
  }

  put(bytes) {
    const computer = this.#computer,
      inserted = computer.insertTape(bytes)

    if (inserted) {
      const recorded = computer.tapeRecorded()

      this.#cassette.wind(recorded)
      this.#position = 0
      this.#leftTurns = this.#cassette.leftTurns(0)
      this.#loaded = true
      this.#engage()
      this.#turn()
    }

    return inserted
  }

  problem() {
    return this.#computer.tapeProblem()
  }

  // A cassette the machine would not read was never a tape, so the label it was shown under is taken off again.
  erase() {
    this.#cassette.erase()
  }

  eject() {
    this.#travel(this.#outward())
  }

  // Returns whether the press took the tape out of the machine. A key pressed while a cassette is being carried is not pressed.
  press(name) {
    const carrying = this.carrying,
      { keys } = this.#figures

    if (carrying) {
      return false
    }

    switch (name) {
      case keys.play:
      case keys.rewind:
      case keys.fastForward:
        this.#latch(name)
        return false
      case keys.pause:
        this.#toggle(name)
        return false
      case keys.record:
        this.#dip(name)
        return false
      case keys.stop:
        return this.#stop()
      default:
        return false
    }
  }

  resetCounter() {
    this.#count = 0
    this.#showCounter()
  }

  // Returns true on the frame a cassette comes to rest in the deck with its lid shut.
  advance(now) {
    const elapsed = this.#last == null ? 0 : now - this.#last

    this.#last = now
    this.#runTape(elapsed)
    this.#moveKeys(elapsed)
    this.#runJourney(now)

    const arrived = this.#arrived

    this.#arrived = false

    return arrived
  }

  #latch(name) {
    const released = this.#travelling.filter(other => other != name)

    for (const other of released) {
      this.#release(other)
    }

    this.#latched.add(name)
    this.#engage()
  }

  #toggle(name) {
    const down = this.#latched.has(name)

    if (down) {
      this.#latched.delete(name)
    } else {
      this.#latched.add(name)
    }

    this.#engage()
  }

  #release(name) {
    const winding = name in this.#winding && this.#latched.has(name) && this.#loaded

    this.#latched.delete(name)

    // The reader plays only forward, so a wound tape is told where it stands once the winding stops.
    if (winding) {
      this.#computer.windTape(this.#position)
    }
  }

  // A key that does not latch is held down for as long as it takes to reach the bottom, and comes back up.
  #dip(name) {
    this.#held.set(name, KEY_TRAVEL)
  }

  #anyDown() {
    return this.#travelling.some(name => this.#latched.has(name))
  }

  #releaseAll() {
    for (const name of this.#travelling) {
      this.#release(name)
    }

    this.#engage()
    this.#dip(this.#figures.keys.stop)
  }

  // STOP/EJECT releases what is down; with nothing down it opens the lid, and a cassette in comes out.
  #stop() {
    const down = this.#anyDown()

    if (down) {
      this.#releaseAll()
      return false
    }

    const ejecting = this.#seated

    this.eject()

    return ejecting
  }

  // The head is on the tape while PLAY is down and PAUSE is not, and there is a tape to be on.
  #engage() {
    const { keys } = this.#figures,
      playing = this.#latched.has(keys.play) && !this.#latched.has(keys.pause),
      engaged = playing && this.#loaded,
      changed = engaged != this.#engaged

    if (changed) {
      this.#engaged = engaged
      this.#computer.engageTape(engaged)
    }
  }

  #runTape(elapsed) {
    const computer = this.#computer,
      turning = this.#loaded && this.powered(computer)

    if (!turning) {
      return
    }

    const length = this.#cassette.playingTime,
      direction = this.#windingDirection(),
      winding = direction != 0

    if (this.#engaged) {
      this.#position = computer.tapePosition()
    } else if (winding) {
      const turns = direction * WINDING_TURNS_PER_MILLISECOND * elapsed

      this.#position = this.#cassette.positionAfter(this.#position, turns)
    }

    const ended = this.#engaged && this.tripped(computer, this.#position, length)

    if (ended) {
      this.#latched.delete(this.#figures.keys.play)
      this.#engage()
    }

    this.#turn()
  }

  #windingDirection() {
    for (const [name, direction] of Object.entries(this.#winding)) {
      const down = this.#latched.has(name)

      if (down) {
        return direction
      }
    }

    return 0
  }

  // The counter counts the left spindle's turns as they are made, so a cassette changed leaves it where it stood.
  #turn() {
    const turns = this.#cassette.leftTurns(this.#position)

    this.#count += (turns - this.#leftTurns) * this.#figures.countsPerTurn
    this.#leftTurns = turns
    this.#cassette.turn(this.#position)
    this.#showCounter()
  }

  #showCounter() {
    const figures = wheelFigures(this.#count)

    for (const [wheel, turned] of this.#wheelTurns.entries()) {
      turned.value = figures[wheel]
    }
  }

  #moveKeys(elapsed) {
    const { pressed, latched } = this.#figures,
      still = REDUCED_MOTION.matches,
      step = (pressed / KEY_TRAVEL) * elapsed

    for (const [name, left] of this.#held) {
      const released = left <= elapsed

      if (released) {
        this.#held.delete(name)
      } else {
        this.#held.set(name, left - elapsed)
      }
    }

    for (const [name, { key, rest }] of this.#keys) {
      const held = this.#held.has(name),
        down = this.#latched.has(name),
        resting = down ? latched : 0,
        target = held ? pressed : resting,
        angle = this.#angles.get(name),
        gap = target - angle,
        distance = Math.abs(gap),
        stepped = Math.min(step, distance),
        turned = still ? target : angle + Math.sign(gap) * stepped

      this.#angles.set(name, turned)
      key.rotation.x = rest + turned
    }
  }

  #travel(steps) {
    const cut = REDUCED_MOTION.matches,
      legs = cut ? steps.map(step => ({ ...step, milliseconds: 0 })) : steps

    this.#journey.push(...legs)
  }

  #runJourney(now) {
    while (this.#journey.length > 0) {
      const [step] = this.#journey,
        beginning = this.#started == null

      if (beginning) {
        this.#started = now
        step.begin?.()
      }

      const instant = step.milliseconds == 0,
        progress = instant ? 1 : Math.min((now - this.#started) / step.milliseconds, 1)

      step.update?.(smoothed(progress))

      const unfinished = progress < 1

      if (unfinished) {
        return
      }

      step.end?.()
      this.#journey.shift()
      this.#started = null
    }
  }

  // STOP/EJECT pressed, and the lid springs up; a tape in it leaves the spindles as it goes.
  #opening() {
    const { keys, openLid } = this.#figures

    return [
      { milliseconds: KEY_TRAVEL, begin: () => this.#dip(keys.stop) },
      {
        milliseconds: LID_OPENING,
        begin: () => this.#takeOut(),
        update: progress => this.#swing(progress * openLid)
      }
    ]
  }

  #closing() {
    const { openLid } = this.#figures

    return [
      {
        milliseconds: LID_CLOSING,
        update: progress => this.#swing((1 - progress) * openLid)
      }
    ]
  }

  // Out of the open deck, down to the desk, and the lid shut behind it.
  #outward() {
    const carried = this.#seated
      ? [
          this.#carry(() => this.#mouth(), SLIDE),
          this.#carry(() => this.#lifted(), CARRY),
          this.#carry(() => this.#rest, LIFT)
        ]
      : []

    return [...this.#opening(), ...carried, ...this.#closing()]
  }

  // Up off the desk, into the open deck, and the lid shut on it.
  #inward() {
    return [
      this.#carry(() => this.#lifted(), LIFT),
      this.#carry(() => this.#mouth(), CARRY),
      this.#carry(() => this.#seatPose(), SLIDE),
      { milliseconds: 0, end: () => this.#seatCassette() },
      ...this.#closing(),
      { milliseconds: 0, end: () => (this.#arrived = true) }
    ]
  }

  #seatCassette() {
    const model = this.#cassette.model

    this.#seat.add(model)
    model.position.set(0, 0, 0)
    model.quaternion.identity()
    this.#seated = true
  }

  #takeOut() {
    const loaded = this.#loaded

    if (loaded) {
      this.#loaded = false
      this.#engage()
      this.#computer.ejectTape()
    }
  }

  #swing(angle) {
    this.#lid.rotation.x = -angle
  }

  #carry(destination, milliseconds) {
    const leg = { destination, from: null, to: null }

    return {
      milliseconds,
      begin: () => this.#takeUp(leg),
      update: progress => this.#carryAlong(leg, progress)
    }
  }

  // A cassette is carried in the room's own terms, whatever it hung from before.
  #takeUp(leg) {
    const model = this.#cassette.model

    this.#scene.attach(model)
    this.#seated = false
    leg.from = { position: model.position.clone(), quaternion: model.quaternion.clone() }
    leg.to = leg.destination()
  }

  #carryAlong({ from, to }, progress) {
    const model = this.#cassette.model

    model.position.lerpVectors(from.position, to.position, progress)
    model.quaternion.slerpQuaternions(from.quaternion, to.quaternion, progress)
  }

  #seatPose() {
    return poseOf(this.#seat)
  }

  #mouth() {
    const seat = this.#seatPose(),
      approach = this.#figures.approach.clone(),
      forward = approach.applyQuaternion(seat.quaternion)

    return { position: seat.position.add(forward), quaternion: seat.quaternion }
  }

  #lifted() {
    const position = this.#rest.position.clone()

    position.y += LIFTED

    return { position, quaternion: this.#rest.quaternion }
  }
}
