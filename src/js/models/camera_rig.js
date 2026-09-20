import {
  Box3,
  MathUtils,
  PerspectiveCamera,
  Raycaster,
  Sphere,
  Spherical,
  Vector3
} from "three/webgpu"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import REDUCED_MOTION from "./reduced_motion"

// Where the camera stands, how far it may turn and how it travels are presentation choices, not measurements of the machine.
const FIELD_OF_VIEW = 35,
  NEAR_PLANE = 0.01

// Each view looks at its subject from a heading and an elevation in degrees, keeping that share of the frame clear around it, and from no closer than its closest, in metres.
const DESK_VIEW = { heading: -32, elevation: 16, margin: 0.25 },
  SET_VIEW = { heading: 0, elevation: 14, margin: 0.03 },
  MONITOR_VIEW = { heading: 0, elevation: 6, margin: 0.12 },
  DRIVE_VIEW = { heading: -22, elevation: 34, margin: 0.1, closest: 0.45 },
  POWER_VIEW = { heading: -25, elevation: 55, margin: 0.35, closest: 0.2 }

const WIDEST_HEADING = 75

// The camera backs away no further than this many times the distance the whole desk needs.
const FURTHEST_RETREAT = 1.5

const FLIGHT_MILLISECONDS = 900

// The share of its turn a released camera keeps each frame.
const GLIDE = 0.92

const DRIVE_PARTS = ["drive", "drive-lamp", "drive-plate", "eject-button"]

// The 6128 has no switch of its own: it takes its 5V and 12V from the monitor,
// whose own power button this desk draws but does not yet wire. Until it does,
// the badge that carries ENC. over the power lamp, and the lamp in its window,
// are what the reader presses. That is a liberty and not the machine.
const POWER_PARTS = ["badge", "power-lamp"]

function cornersOf({ min, max }) {
  const corners = []

  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        const corner = new Vector3(x, y, z)

        corners.push(corner)
      }
    }
  }

  return corners
}

// Each corner, carried along the frame's edge to the plane through the
// subject's middle, marks how far the frame must span there.
function fit(corners, axis, forward, slope) {
  let spanStart = Infinity,
    spanEnd = -Infinity

  for (const corner of corners) {
    const along = corner.dot(axis),
      deep = corner.dot(forward)

    spanStart = Math.min(spanStart, along + slope * deep)
    spanEnd = Math.max(spanEnd, along - slope * deep)
  }

  return { along: (spanStart + spanEnd) / 2, distance: (spanEnd - spanStart) / (2 * slope) }
}

function sphericalOf({ eye, target }) {
  const offset = new Vector3().subVectors(eye, target)

  return new Spherical().setFromVector3(offset)
}

export default class CameraRig {
  camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR_PLANE)
  view = null
  #controls
  #flight = null
  #leadsTo = new Map()
  #models = []
  #raycaster = new Raycaster()
  #turning = false
  #views = null

  constructor(canvas) {
    const controls = new OrbitControls(this.camera, canvas),
      widest = MathUtils.degToRad(WIDEST_HEADING)

    controls.enablePan = false
    controls.dampingFactor = 1 - GLIDE
    controls.minAzimuthAngle = -widest
    controls.maxAzimuthAngle = widest
    controls.maxPolarAngle = Math.PI / 2
    controls.addEventListener("start", this.onTurnStarted.bind(this))
    controls.addEventListener("change", this.onTurned.bind(this))
    controls.addEventListener("end", this.onTurnEnded.bind(this))

    this.#controls = controls
  }

  use({ machine, monitor }) {
    const glass = monitor.getObjectByName("screen"),
      drive = machine.getObjectByName("drive"),
      leadsTo = this.#leadsTo

    // A box takes its object's ancestors as they last stood, and nothing has
    // been drawn yet to carry the monitor to its place behind the machine.
    machine.updateWorldMatrix(true, true)
    monitor.updateWorldMatrix(true, true)

    const whole = new Box3().setFromObject(machine).expandByObject(monitor),
      screen = new Box3().setFromObject(glass),
      driveFace = new Box3().setFromObject(drive)

    // The drive runs deep into the machine; only its face, at the front, is framed.
    driveFace.min.z = driveFace.max.z

    monitor.traverse(part => leadsTo.set(part, "monitor"))

    for (const name of DRIVE_PARTS) {
      const part = machine.getObjectByName(name)

      part.traverse(piece => leadsTo.set(piece, "drive"))
    }

    for (const name of POWER_PARTS) {
      const part = machine.getObjectByName(name)

      part.traverse(piece => leadsTo.set(piece, "power"))
    }

    // The badge lies in the rear strip's top; only that face is framed, and the
    // lamp stands inside its footprint.
    const plate = machine.getObjectByName("badge"),
      badge = new Box3().setFromObject(plate)

    badge.min.y = badge.max.y

    this.#models = [machine, monitor]
    this.#views = new Map([
      ["desk", { subject: whole, ...DESK_VIEW }],
      ["set", { subject: whole, ...SET_VIEW }],
      ["monitor", { subject: screen, ...MONITOR_VIEW }],
      ["drive", { subject: driveFace, ...DRIVE_VIEW }],
      ["power", { subject: badge, ...POWER_VIEW }]
    ])

    const pose = this.#pose("desk")

    this.view = "desk"
    this.#boundRetreat()
    this.#stand(pose)
  }

  look(view) {
    const still = REDUCED_MOTION.matches

    this.#stopGliding()
    this.view = view

    if (still) {
      const pose = this.#pose(view)

      this.#flight = null
      this.#stand(pose)
      return
    }

    const from = { eye: this.camera.position.clone(), target: this.#controls.target.clone() }

    this.#flight = { from, started: null }
  }

  advance(now) {
    const flight = this.#flight

    if (!flight) {
      this.#controls.update()
      return
    }

    flight.started ??= now

    const progress = Math.min((now - flight.started) / FLIGHT_MILLISECONDS, 1),
      to = this.#pose(this.view),
      arrived = progress == 1

    if (arrived) {
      this.#flight = null
      this.#stand(to)
      return
    }

    const eased = MathUtils.smootherstep(progress, 0, 1),
      start = sphericalOf(flight.from),
      end = sphericalOf(to),
      radius = start.radius * (end.radius / start.radius) ** eased,
      phi = MathUtils.lerp(start.phi, end.phi, eased),
      theta = MathUtils.lerp(start.theta, end.theta, eased),
      offset = new Vector3().setFromSphericalCoords(radius, phi, theta),
      target = new Vector3().lerpVectors(flight.from.target, to.target, eased)

    this.#controls.target.copy(target)
    this.camera.position.copy(target).add(offset)
    this.camera.lookAt(target)
  }

  resize(width, height) {
    const camera = this.camera,
      inUse = this.#views != null,
      standing = this.view != null && this.#flight == null

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    if (!inUse) {
      return
    }

    this.#boundRetreat()

    if (standing) {
      const pose = this.#pose(this.view)

      this.#stand(pose)
    }
  }

  pick(pointer) {
    const raycaster = this.#raycaster

    raycaster.setFromCamera(pointer, this.camera)

    const [nearest] = raycaster.intersectObjects(this.#models),
      part = nearest?.object

    return { name: part?.name, view: this.#leadsTo.get(part) }
  }

  dispose() {
    this.#controls.dispose()
  }

  onTurnStarted() {
    this.#turning = true
    this.#letGlide()
  }

  onTurned() {
    const turning = this.#turning

    if (turning) {
      this.#flight = null
      this.view = null
    }
  }

  onTurnEnded() {
    this.#turning = false
  }

  #letGlide() {
    this.#controls.enableDamping = !REDUCED_MOTION.matches
  }

  // OrbitControls offers no way to stop a glide but to spend it: one update
  // without damping spends what is left, and the camera is put back where it was.
  // That update fires a change, which a pointer still held reads as a turn.
  #stopGliding() {
    const controls = this.#controls,
      eye = this.camera.position.clone(),
      facing = this.camera.quaternion.clone(),
      target = controls.target.clone()

    controls.enableDamping = false
    controls.update()
    this.camera.position.copy(eye)
    this.camera.quaternion.copy(facing)
    controls.target.copy(target)
    this.#letGlide()
  }

  // Whatever the camera turns round lies within the whole desk's sphere, so the
  // desk's far side is never further than the sphere's width beyond it.
  #boundRetreat() {
    const whole = this.#pose("desk"),
      furthest = whole.eye.distanceTo(whole.target) * FURTHEST_RETREAT

    this.#controls.maxDistance = furthest
    this.camera.far = furthest + whole.radius * 2
    this.camera.updateProjectionMatrix()
  }

  #stand({ eye, target, radius }) {
    const controls = this.#controls

    this.camera.position.copy(eye)
    controls.target.copy(target)
    controls.minDistance = radius
    controls.update()
  }

  #pose(view) {
    const { subject, heading, elevation, margin, closest = 0 } = this.#views.get(view),
      camera = this.camera,
      polar = MathUtils.degToRad(90 - elevation),
      azimuth = MathUtils.degToRad(heading),
      halfField = MathUtils.degToRad(camera.fov / 2),
      backward = new Vector3().setFromSphericalCoords(1, polar, azimuth),
      forward = backward.clone().negate(),
      across = new Vector3().crossVectors(forward, camera.up).normalize(),
      upward = new Vector3().crossVectors(across, forward),
      vertical = Math.tan(halfField) * (1 - margin),
      horizontal = vertical * camera.aspect,
      centre = new Vector3(),
      holding = new Sphere()

    subject.getCenter(centre)
    subject.getBoundingSphere(holding)

    const corners = cornersOf(subject).map(corner => corner.sub(centre)),
      sideways = fit(corners, across, forward, horizontal),
      upwards = fit(corners, upward, forward, vertical),
      distance = Math.max(sideways.distance, upwards.distance, closest),
      target = centre
        .clone()
        .addScaledVector(across, sideways.along)
        .addScaledVector(upward, upwards.along),
      eye = target.clone().addScaledVector(backward, distance)

    return { eye, target, radius: holding.radius }
  }
}
