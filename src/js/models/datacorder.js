import {
  MathUtils,
  MeshStandardNodeMaterial,
  Quaternion,
  RepeatWrapping,
  Vector3
} from "three/webgpu"
import { texture, uniform, uv, vec2 } from "three/tsl"
import REDUCED_MOTION from "./reduced_motion"

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

// What each key does is the user instructions' [A], ch. 2: https://archive.org/details/cpc464.en. PLAY, REW and F.F. latch, and STOP/EJECT releases them, "and reset all the cassette operation keys to the original state. If the key is released and then pressed again, the cassette lid will open." REC works only held with PLAY, which a single pointer cannot do, so it goes down and comes back. PAUSE stays down on its own, "check that the [PAUSE] key has not been accidentally pressed down", and is pressed on and pressed off.
// Pressing one of PLAY, REW and F.F. while another is down releases it, as the one locking plate behind them would, and PAUSE, which has a lock plate of its own, stays as it stands through STOP/EJECT [A], the service manual's parts, ibid., "Locking Plate 170206" and "Pause Lock Plate 809168"; how the plates behave is read from those parts, and is a guess.
const WINDING = { [KEYS.rewind]: -1, [KEYS.fastForward]: 1 },
  TRAVELLING = [KEYS.play, KEYS.rewind, KEYS.fastForward]

// A key turns nose down on its lever's rod: 19° held down and 15° latched, read on two photographs of PLAY, one held by a finger and one latched beside keys at rest [E]: https://i.ytimg.com/vi/aC0WpCXMPno/maxresdefault.jpg and https://i.ytimg.com/vi/Dv6iysaQK2I/maxresdefault.jpg. Only PLAY was read: REC, REW, F.F., STOP/EJECT and PAUSE are taken to travel as far.
const PRESSED = MathUtils.degToRad(19),
  LATCHED = MathUtils.degToRad(15)

// The lid opens 28.5° to a stop, with or without a cassette in it, on the museum's photographs from one tripod, shut and open, through a camera calibrated on the prints [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(16).jpg
// How fast a key travels, the lid swings and a cassette is carried, in milliseconds, are presentation choices: no damper is among the lid's parts, so it springs up quickly.
const KEY_TRAVEL = 120,
  LID_OPENING = 180,
  LID_CLOSING = 420,
  LIFT = 360,
  CARRY = 520,
  SLIDE = 420,
  OPEN_LID = MathUtils.degToRad(28.5)

// How high a cassette is lifted off the desk, and how far in front of the holder it is brought before it slides in, in metres, are presentation choices.
const LIFTED = 0.06,
  MOUTH = 0.075

// How fast F.F. and REW wind is measured on no 464. A deck of the time winds a C60's side in about 90 seconds [A], "Approx. 90 sec. (with C-60)": https://www.manualslib.com/manual/3312455/Sony-Tc-U30.html?page=12, which turns the winding spindle about 8 times a second [E]; that speed is a guess here, held whatever the pack, so the tape runs faster as it piles up.
const WINDING_TURNS_PER_MILLISECOND = 0.008

// The counter counts 0.8 for each turn of the left spindle, the reel the tape plays off [E]: the counter numbers Loriciels' Pharaon gives for its own blocks, in its French and its Spanish release, fit the turns of that reel to within a count, and those of the other reel no closer than 8. The figure rests on the tape being a C60's usual 16 to 18 µm and on the standard's hub, 21.7 across, neither of which any source gives for those tapes: https://www.cpc-power.com/index.php?page=protection&lenom=COMPTEUR%20CASSETTE
const COUNTS_PER_TURN = 0.8

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
function rollingWheel(machine, name) {
  const wheel = machine.getObjectByName(name),
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

export default class Datacorder {
  // The parts a reader works: the lid a cassette goes in at, the keys and the counter's lever.
  static PARTS = ["cassette-lid", ...Object.values(KEYS), RESET_LEVER]

  // The room the machine gives a tape, which an image must stand inside.
  capacity

  #angles = new Map()
  #arrived = false
  #cassette
  #count = 0
  #cpc
  #engaged = false
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
  #wheelTurns

  constructor(machine, cassette, cpc) {
    this.capacity = cpc.tapeCapacity
    this.#cassette = cassette
    this.#cpc = cpc
    this.#lid = machine.getObjectByName("cassette-lid")
    this.#seat = machine.getObjectByName("cassette-seat")
    this.#scene = cassette.model.parent
    this.#rest = poseOf(cassette.model)
    this.#wheelTurns = WHEELS.map(name => rollingWheel(machine, name))

    for (const name of Object.values(KEYS)) {
      const key = machine.getObjectByName(name)

      this.#keys.set(name, { key, rest: key.rotation.x })
      this.#angles.set(name, 0)
    }

    this.#showCounter()
  }

  // A cassette is carried by hand, so the deck takes no other while one is on its way.
  get carrying() {
    return this.#journey.length > 0
  }

  // What a click on one of the deck's parts asks of it: a key pressed or the counter reset.
  answers(name) {
    const pressed = Object.values(KEYS).includes(name),
      resetting = name == RESET_LEVER

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
    const cpc = this.#cpc,
      inserted = cpc.insertTape(bytes)

    if (inserted) {
      const recorded = cpc.tapeRecorded()

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
    return this.#cpc.tapeProblem()
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
    const carrying = this.carrying

    if (carrying) {
      return false
    }

    switch (name) {
      case KEYS.play:
      case KEYS.rewind:
      case KEYS.fastForward:
        this.#latch(name)
        return false
      case KEYS.pause:
        this.#toggle(name)
        return false
      case KEYS.record:
        this.#dip(name)
        return false
      case KEYS.stop:
        return this.#stop()
      default:
        return false
    }
  }

  resetCounter() {
    this.#count = 0
    this.#showCounter()
  }

  // Returns true on the frame a cassette comes to rest in the machine with its lid shut.
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
    const released = TRAVELLING.filter(other => other != name)

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
    const winding = name in WINDING && this.#latched.has(name) && this.#loaded

    this.#latched.delete(name)

    // The reader plays only forward, so a wound tape is told where it stands once the winding stops.
    if (winding) {
      this.#cpc.windTape(this.#position)
    }
  }

  // A key that does not latch is held down for as long as it takes to reach the bottom, and comes back up.
  #dip(name) {
    this.#held.set(name, KEY_TRAVEL)
  }

  #anyDown() {
    return TRAVELLING.some(name => this.#latched.has(name))
  }

  #releaseAll() {
    for (const name of TRAVELLING) {
      this.#release(name)
    }

    this.#engage()
    this.#dip(KEYS.stop)
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
    const playing = this.#latched.has(KEYS.play) && !this.#latched.has(KEYS.pause),
      engaged = playing && this.#loaded

    const changed = engaged != this.#engaged

    if (changed) {
      this.#engaged = engaged
      this.#cpc.engageTape(engaged)
    }
  }

  // The motor runs off the computer's own supply, so nothing turns while it is switched off.
  #runTape(elapsed) {
    const turning = this.#loaded && this.#cpc.running

    if (!turning) {
      return
    }

    const length = this.#cassette.playingTime,
      direction = this.#windingDirection(),
      winding = direction != 0

    if (this.#engaged) {
      this.#position = this.#cpc.tapePosition()
    } else if (winding) {
      const turns = direction * WINDING_TURNS_PER_MILLISECOND * elapsed

      this.#position = this.#cassette.positionAfter(this.#position, turns)
    }

    // At the tape's end a trip in the mechanism lets PLAY up [A], ch. 2: "Both the [REC] and [PLAY] keys are reset by a mechanical trip in the mechanism when the cassette tape reaches its end." F.F. and REW stall there instead.
    const ended = this.#engaged && this.#position >= length

    if (ended) {
      this.#latched.delete(KEYS.play)
      this.#engage()
    }

    this.#turn()
  }

  #windingDirection() {
    for (const [name, direction] of Object.entries(WINDING)) {
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

    this.#count += (turns - this.#leftTurns) * COUNTS_PER_TURN
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
    const still = REDUCED_MOTION.matches,
      step = (PRESSED / KEY_TRAVEL) * elapsed

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
        latched = this.#latched.has(name),
        resting = latched ? LATCHED : 0,
        target = held ? PRESSED : resting,
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
    return [
      { milliseconds: KEY_TRAVEL, begin: () => this.#dip(KEYS.stop) },
      {
        milliseconds: LID_OPENING,
        begin: () => this.#takeOut(),
        update: progress => this.#swing(progress * OPEN_LID)
      }
    ]
  }

  #closing() {
    return [
      {
        milliseconds: LID_CLOSING,
        update: progress => this.#swing((1 - progress) * OPEN_LID)
      }
    ]
  }

  // Out of the open holder, down to the desk, and the lid shut behind it.
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

  // Up off the desk, into the open holder, and the lid shut on it.
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
      this.#cpc.ejectTape()
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
      forward = new Vector3(0, 0, MOUTH).applyQuaternion(seat.quaternion)

    return { position: seat.position.add(forward), quaternion: seat.quaternion }
  }

  #lifted() {
    const position = this.#rest.position.clone()

    position.y += LIFTED

    return { position, quaternion: this.#rest.quaternion }
  }
}
