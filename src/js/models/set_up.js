import { Box3, MathUtils, PerspectiveCamera, Scene, Vector3 } from "three/webgpu"
import Flight from "./flight"
import GlassTop from "./glass_top"
import Model from "./model"
import Motion from "./motion"
import PIECES from "../pieces"
import Pose from "./pose"
import REDUCED_MOTION from "./reduced_motion"
import arrange from "./arrangement"
import boundsOf from "./bounds_of"

// The desk is seen whole from its front left and above, the eye standing where every piece the computer could be given has room, so that it stays put while they are chosen. Presentation choices: the heading and the elevation in degrees, and how much room, as a share of what the pieces need.
const HEADING = -25,
  ELEVATION = 25,
  ROOM = 1.12

// A display comes in from the left, behind the computer, where nothing else stands, and a piece beside it from the right, each from wholly beyond the canvas, a little further still and lifted, both in metres, and each goes back the way it came. Each takes so many milliseconds, those coming one after another by the stagger; those coming, and those staying that move to new places, set off once the others have gone, for a display going and a display coming pass the same way; and the glass fades in or out. Presentation choices.
const BEYOND = 0.05,
  LIFT = 0.12,
  COMING_MILLISECONDS = 550,
  GOING_MILLISECONDS = 300,
  MOVING_MILLISECONDS = 450,
  FADING_MILLISECONDS = 450,
  STAGGER = 80

const UP = new Vector3(0, 1, 0)

const DOUBLINGS = 6,
  HALVINGS = 12

function cornersOf({ min, max }) {
  const corners = []

  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        corners.push(new Vector3(x, y, z))
      }
    }
  }

  return corners
}

// Each piece stands as the kind the desk takes it as: a monitor, a television,
// a drive or a recorder.
function piecesBy(names, models) {
  const pieces = {}

  for (const name of names) {
    pieces[PIECES[name].kind] = models.get(name)
  }

  return pieces
}

// Where a piece and each of its parts stand: arranging a desk moves a piece
// whole, or its parts, as the drive's.
function stanceOf(piece) {
  return [piece, ...piece.children].map(function (part) {
    const { position, quaternion, scale } = part

    return {
      part,
      position: position.clone(),
      quaternion: quaternion.clone(),
      scale: scale.clone()
    }
  })
}

function standBetween(from, to, progress) {
  for (const [index, { part, position, quaternion, scale }] of from.entries()) {
    const target = to[index]

    part.position.lerpVectors(position, target.position, progress)
    part.quaternion.slerpQuaternions(quaternion, target.quaternion, progress)
    part.scale.lerpVectors(scale, target.scale, progress)
  }
}

// A computer turned about its own middle, the point it turns on in the line-up.
function turn(computer, middle, angle) {
  const turned = middle.clone()

  turned.applyAxisAngle(UP, angle)
  computer.rotation.y = angle
  computer.position.subVectors(middle, turned)
}

// A corner behind the eye projects mirrored, and is taken for beyond.
function beyondCanvas(reach, offset, side, eye) {
  const moved = reach.clone()

  moved.translate(offset)

  return cornersOf(moved).every(function (corner) {
    corner.applyMatrix4(eye.matrixWorldInverse)

    const behind = corner.z >= 0

    corner.applyMatrix4(eye.projectionMatrix)

    return behind || corner.x * side > 1
  })
}

function aside(stance, offset) {
  const [whole, ...parts] = stance,
    position = whole.position.clone()

  position.add(offset)

  return [{ ...whole, position }, ...parts]
}

export default class SetUp {
  scene = new Scene()
  #computer = null
  #corners = []
  #eye = new PerspectiveCamera()
  #glass
  #middle = new Vector3()
  #motions = new Map()
  #name
  #offered
  #pieces = new Map()
  #pose = new Pose()
  #posedFor = null
  #standing = new Set()
  #width

  // Every piece the computer may be given is loaded, so that choosing one never
  // waits on it.
  async load({ name, displays, beside }, { anisotropy, studio }) {
    const names = [...displays, ...beside],
      loading = names.map(each => Model.load(each, { anisotropy, small: true })),
      pieces = await Promise.all(loading)

    this.#name = name
    this.#offered = { displays, beside }
    studio.light(this.scene)

    for (const [index, piece] of pieces.entries()) {
      piece.visible = false
      this.#pieces.set(names[index], piece)
      this.scene.add(piece)
    }
  }

  // The computer is framed standing square at the origin, and turns square
  // from however the line-up let it go while it flies in.
  stand(computer) {
    const turned = computer.rotation.y,
      from = Math.atan2(Math.sin(turned), Math.cos(turned)),
      middle = new Vector3(),
      duration = REDUCED_MOTION.matches ? 0 : Flight.MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      motion = new Motion(timing, progress => turn(computer, middle, from * (1 - progress)))

    turn(computer, middle, 0)
    this.#computer = computer
    this.scene.add(computer)
    this.#frame()

    const square = boundsOf(computer)

    square.getCenter(middle)
    turn(computer, middle, from)
    this.#motions.set(computer, motion)
  }

  // Pieces no longer chosen go, those chosen come, and those that stay move to
  // where the new arrangement stands them, the stage framed on the canvas as
  // given. A piece still on its way is taken from wherever it has reached.
  choose(chosen, framing) {
    const wanted = chosen.filter(name => this.#pieces.has(name)),
      going = [...this.#standing].filter(name => !wanted.includes(name)),
      waiting = going.length > 0 ? GOING_MILLISECONDS : 0,
      current = new Map(),
      arranged = new Map()

    for (const [name, piece] of this.#pieces) {
      const shown = piece.visible

      if (shown) {
        const stance = stanceOf(piece),
          reach = boundsOf(piece)

        current.set(name, { stance, reach })
      }
    }

    for (const name of wanted) {
      this.#pieces.get(name).position.set(0, 0, 0)
    }

    const pieces = piecesBy(wanted, this.#pieces)

    arrange(this.#computer, pieces)

    for (const name of wanted) {
      const piece = this.#pieces.get(name),
        stance = stanceOf(piece),
        reach = boundsOf(piece)

      arranged.set(name, { stance, reach })
    }

    for (const { stance } of current.values()) {
      standBetween(stance, stance, 0)
    }

    for (const name of going) {
      this.#go(name, current.get(name), framing)
    }

    let arrivals = 0

    for (const name of wanted) {
      const { stance: to, reach } = arranged.get(name),
        piece = this.#pieces.get(name),
        stayed = this.#standing.has(name),
        underway = this.#motions.has(piece),
        delay = stayed ? (underway ? 0 : waiting) : waiting + arrivals * STAGGER,
        was = current.get(name)

      let from = was?.stance

      if (!was) {
        const offstage = this.#offstageOf(name, reach, framing)

        from = aside(to, offstage)
      }

      if (!stayed) {
        arrivals++
      }

      this.#come(name, from, to, { delay, stayed })
    }

    this.#standing = new Set(wanted)

    const clear = this.#glass.presence < 1

    if (clear) {
      this.#fade(1)
    }
  }

  // Everything on the desk goes but the computer, and the glass with it.
  leave(framing) {
    const going = [this.#fade(0)]

    for (const name of this.#standing) {
      const piece = this.#pieces.get(name),
        stance = stanceOf(piece),
        reach = boundsOf(piece),
        gone = this.#go(name, { stance, reach }, framing)

      going.push(gone)
    }

    this.#standing = new Set()

    return Promise.all(going)
  }

  advance(now) {
    let moving = false

    for (const [object, motion] of this.#motions) {
      const going = motion.advance(now)

      if (!going) {
        this.#motions.delete(object)
      }

      moving ||= going
    }

    return moving
  }

  // The desk in the frame the page gives it.
  views(frameOf) {
    const frame = frameOf(this.#name),
      pose = this.#poseFor(frame.width / frame.height)

    return [{ name: this.#name, pose, frame, scene: this.scene, clipped: false }]
  }

  // The computer leaves for the line-up, still standing square at the origin.
  release() {
    const computer = this.#computer

    this.scene.remove(computer)
    this.#computer = null

    return computer
  }

  // The computer is not the set-up's to free: it leaves for the line-up first.
  dispose() {
    for (const piece of this.#pieces.values()) {
      piece.dispose()
    }

    this.#glass.dispose()
  }

  #go(name, { stance: from, reach }, framing) {
    const piece = this.#pieces.get(name),
      offstage = this.#offstageOf(name, reach, framing),
      to = aside(from, offstage),
      duration = REDUCED_MOTION.matches ? 0 : GOING_MILLISECONDS,
      timing = { duration, ease: Motion.easeIn },
      motion = new Motion(timing, function (progress) {
        standBetween(from, to, progress)
        piece.visible = progress < 1
      })

    this.#motions.set(piece, motion)

    return motion.finished
  }

  #come(name, from, to, { delay, stayed }) {
    const piece = this.#pieces.get(name),
      reduced = REDUCED_MOTION.matches,
      duration = stayed ? MOVING_MILLISECONDS : COMING_MILLISECONDS,
      ease = stayed ? Motion.easeInOut : Motion.easeOut,
      timing = reduced ? { duration: 0, ease } : { duration, delay, ease },
      motion = new Motion(timing, progress => standBetween(from, to, progress))

    standBetween(from, from, 0)
    piece.visible = true
    this.#motions.set(piece, motion)
  }

  #fade(presence) {
    const glass = this.#glass,
      from = glass.presence,
      duration = REDUCED_MOTION.matches ? 0 : FADING_MILLISECONDS,
      timing = { duration, ease: Motion.easeInOut },
      motion = new Motion(timing, function (progress) {
        const reached = MathUtils.lerp(from, presence, progress)

        glass.presence = reached
        glass.visible = reached > 0
      })

    this.#motions.set(glass, motion)

    return motion.finished
  }

  // How far to its side a piece must stand from the reach given, lifted, to be
  // wholly beyond the canvas the stage is framed on.
  #offstageOf(name, reach, { frame, canvas }) {
    const display = this.#offered.displays.includes(name),
      side = display ? -1 : 1,
      pose = this.#poseFor(frame.width / frame.height),
      eye = this.#eye,
      offset = new Vector3(0, LIFT, 0)

    pose.place(eye, frame, canvas)
    eye.updateMatrixWorld()

    let short = 0,
      clear = this.#width

    for (let doubling = 0; ; doubling++) {
      offset.x = side * clear

      const beyond = beyondCanvas(reach, offset, side, eye),
        exhausted = doubling == DOUBLINGS

      if (beyond) {
        break
      }

      if (exhausted) {
        throw new Error(`The ${name} finds no edge of the canvas within ${clear} m`)
      }

      short = clear
      clear *= 2
    }

    for (let halving = 0; halving < HALVINGS; halving++) {
      const halfway = (short + clear) / 2

      offset.x = side * halfway

      const beyond = beyondCanvas(reach, offset, side, eye)

      if (beyond) {
        clear = halfway
      } else {
        short = halfway
      }
    }

    offset.x = side * (clear + BEYOND)

    return offset
  }

  // Every display with whatever else may stand beside it, by the corners of
  // each part: the corners of one box round a whole desk, or round a whole
  // drive with its interface and ribbon, stand in the air. A part that only
  // marks a place, as a slot or a connector, reaches nowhere. The glass lies
  // under the whole of them.
  #frame() {
    const { displays, beside } = this.#offered,
      whole = new Box3()

    for (const display of displays) {
      const pieces = piecesBy([display, ...beside], this.#pieces)

      arrange(this.#computer, pieces)

      for (const standing of [this.#computer, ...Object.values(pieces)]) {
        for (const part of standing.children) {
          const reach = boundsOf(part),
            marker = reach.isEmpty()

          if (!marker) {
            const corners = cornersOf(reach)

            whole.union(reach)
            this.#corners.push(...corners)
          }
        }
      }
    }

    const glass = new GlassTop(whole)

    glass.visible = false
    this.#glass = glass
    this.scene.add(glass)
    whole.getCenter(this.#middle)
    this.#width = whole.max.x - whole.min.x
  }

  // The eye stands as far back as the corner that most wants room needs, and
  // the picture is then shifted to stand what it sees in the middle of the
  // frame: the middle of the pieces in space is not the middle of their picture.
  #poseFor(aspect) {
    const pose = this.#pose,
      posed = this.#posedFor == aspect

    if (posed) {
      return pose
    }

    const halfField = MathUtils.degToRad(Pose.FIELD_OF_VIEW / 2),
      halfHigh = Math.tan(halfField),
      halfWide = halfHigh * aspect,
      towardEye = new Vector3(),
      right = new Vector3(),
      up = new Vector3(),
      offset = new Vector3(),
      pictured = new Box3()

    pose.aim.copy(this.#middle)
    pose.heading = MathUtils.degToRad(HEADING)
    pose.elevation = MathUtils.degToRad(ELEVATION)
    pose.shift.set(0, 0)
    pose.towardEye(towardEye)
    right.set(Math.cos(pose.heading), 0, -Math.sin(pose.heading))
    up.crossVectors(towardEye, right)

    let distance = 0

    for (const corner of this.#corners) {
      offset.subVectors(corner, this.#middle)

      const toward = offset.dot(towardEye),
        across = Math.abs(offset.dot(right)) / halfWide,
        rise = Math.abs(offset.dot(up)) / halfHigh,
        needed = toward + Math.max(across, rise) * ROOM

      distance = Math.max(distance, needed)
    }

    for (const corner of this.#corners) {
      offset.subVectors(corner, this.#middle)

      const depth = distance - offset.dot(towardEye),
        across = offset.dot(right) / (depth * halfWide),
        rise = offset.dot(up) / (depth * halfHigh),
        projected = new Vector3(across, rise, 0)

      pictured.expandByPoint(projected)
    }

    const centre = new Vector3()

    pictured.getCenter(centre)
    pose.distance = distance
    pose.shift.set(centre.x, centre.y)
    this.#posedFor = aspect

    return pose
  }
}
