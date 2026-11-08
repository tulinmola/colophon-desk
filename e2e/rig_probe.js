import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three/webgpu"
import CameraRig from "../src/js/models/camera_rig.js"

// A block standing apart from the others, so a pointer aimed at its middle
// finds it and nothing in front of it.
function part(name, [x, y, z], parent) {
  const geometry = new BoxGeometry(0.06, 0.02, 0.06),
    material = new MeshBasicMaterial(),
    mesh = new Mesh(geometry, material)

  mesh.name = name
  mesh.position.set(x, y, z)
  parent.add(mesh)

  return mesh
}

function pointerAt(mesh, camera) {
  const centre = new Vector3()

  mesh.getWorldPosition(centre)
  centre.project(camera)

  return { x: centre.x, y: centre.y }
}

// Where the badge leads, and the power switch where there is one, on a machine
// with a switch of its own or without one.
export default function leadsOf(switched) {
  const machine = new Group(),
    monitor = new Group(),
    canvas = document.createElement("canvas"),
    rig = new CameraRig(canvas),
    badge = part("badge", [-0.1, 0, 0], machine)

  part("power-lamp", [-0.1, 0.03, 0], machine)
  part("screen", [0, 0.1, -0.3], monitor)

  const powerSwitch = switched ? part("power-switch", [0.1, 0, 0], machine) : null

  rig.resize(480, 360)
  rig.use({ machine, monitor })

  const badgeAim = pointerAt(badge, rig.camera),
    leads = { badge: rig.pick(badgeAim).view ?? null }

  if (powerSwitch) {
    const switchAim = pointerAt(powerSwitch, rig.camera)

    leads.powerSwitch = rig.pick(switchAim).view
  }

  rig.dispose()

  return leads
}
