import { Document, NodeIO } from "@gltf-transform/core"
import { mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { Color } from "three"
import { EXTMeshGPUInstancing } from "@gltf-transform/extensions"
import { Resvg } from "@resvg/resvg-js"
import { buildCf2 } from "./models/cf2.js"
import { buildCpc6128 } from "./models/cpc6128.js"
import { buildCtm644 } from "./models/ctm644.js"
import { fileURLToPath } from "node:url"
import opencascade from "replicad-opencascadejs"
import { setOC } from "replicad"

const KERNEL_WASM_URL = import.meta.resolve("replicad-opencascadejs/wasm"),
  KERNEL_WASM = fileURLToPath(KERNEL_WASM_URL),
  ROOT = resolve(import.meta.dirname, ".."),
  MODELS_DIR = resolve(ROOT, "src/assets/models"),
  TEXTURES_DIR = resolve(ROOT, "src/assets/textures"),
  FONTS_DIR = resolve(ROOT, "tools/fonts")

// glTF counts in metres, with y up and the front toward +z: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units
const METRES_PER_MILLIMETRE = 0.001

function toGltf(values, scale) {
  const converted = new Float32Array(values.length)

  for (let index = 0; index < values.length; index += 3) {
    converted[index] = values[index] * scale
    converted[index + 1] = values[index + 2] * scale
    converted[index + 2] = -values[index + 1] * scale
  }

  return converted
}

// A texture's first row is the top of its image, where a face's rear edge goes: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images
function faceUvs(vertices, face) {
  const uvs = new Float32Array((vertices.length / 3) * 2),
    width = face.right - face.left,
    depth = face.rear - face.front

  for (
    let uvIndex = 0, positionIndex = 0;
    positionIndex < vertices.length;
    uvIndex += 2, positionIndex += 3
  ) {
    uvs[uvIndex] = (vertices[positionIndex] - face.left) / width
    uvs[uvIndex + 1] = (face.rear - vertices[positionIndex + 1]) / depth
  }

  return uvs
}

// A part's own rule is asked for each vertex, in the millimetres the part was built in.
function mappedUvs(vertices, mapping) {
  const uvs = new Float32Array((vertices.length / 3) * 2)

  for (
    let uvIndex = 0, positionIndex = 0;
    positionIndex < vertices.length;
    uvIndex += 2, positionIndex += 3
  ) {
    const place = [
        vertices[positionIndex],
        vertices[positionIndex + 1],
        vertices[positionIndex + 2]
      ],
      [u, v] = mapping(place)

    uvs[uvIndex] = u
    uvs[uvIndex + 1] = v
  }

  return uvs
}

// An instance is turned by a unit quaternion, x, y, z and w: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing. The kernel's x axis is glTF's, so a tilt about it carries over.
function tiltAboutX(degrees) {
  const half = (degrees * Math.PI) / 360

  return [Math.sin(half), 0, 0, Math.cos(half)]
}

const FONT_NAMES = readdirSync(FONTS_DIR).filter(fontName => fontName.endsWith(".otf")),
  FONT_FILES = FONT_NAMES.map(fontName => resolve(FONTS_DIR, fontName))

function writePrint(modelName, print) {
  const rendering = new Resvg(print.svg, {
      fitTo: { mode: "zoom", value: print.pixels },
      font: { loadSystemFonts: false, fontFiles: FONT_FILES }
    }),
    png = rendering.render().asPng(),
    directory = resolve(TEXTURES_DIR, print.language),
    path = resolve(directory, `${modelName}-${print.name}.png`)

  mkdirSync(directory, { recursive: true })
  writeFileSync(path, png)
  console.log(`==> Wrote ${relative(ROOT, path)}`)
}

function createAccessor(document, buffer, type, array) {
  return document.createAccessor().setType(type).setArray(array).setBuffer(buffer)
}

function createInstancing(document, parts) {
  const standsForKeys = parts.some(part => Object.hasOwn(part, "keys"))

  if (standsForKeys) {
    return document.createExtension(EXTMeshGPUInstancing).setRequired(true)
  }

  return null
}

function createMaterials(document, parts) {
  const descriptions = parts.map(part => part.material),
    materials = new Set(descriptions),
    gltfMaterials = new Map()

  for (const material of materials) {
    const { r, g, b } = new Color(material.colour),
      gltfMaterial = document.createMaterial(material.name).setBaseColorFactor([r, g, b, 1])

    gltfMaterial.setMetallicFactor(0)
    gltfMaterials.set(material, gltfMaterial)
  }

  return gltfMaterials
}

function createKeyInstances(document, buffer, instancing, part) {
  const tilt = tiltAboutX(part.tilt),
    places = part.keys.flatMap(key => key.place),
    tilts = part.keys.flatMap(() => tilt),
    numbers = part.keys.map(key => key.number),
    legends = part.keys.flatMap(key => key.legend),
    translations = toGltf(places, METRES_PER_MILLIMETRE),
    rotations = new Float32Array(tilts),
    keyNumbers = new Float32Array(numbers),
    legendRectangles = new Float32Array(legends),
    translation = createAccessor(document, buffer, "VEC3", translations),
    rotation = createAccessor(document, buffer, "VEC4", rotations),
    keyNumber = createAccessor(document, buffer, "SCALAR", keyNumbers),
    legend = createAccessor(document, buffer, "VEC4", legendRectangles)

  return instancing
    .createInstancedMesh()
    .setAttribute("TRANSLATION", translation)
    .setAttribute("ROTATION", rotation)
    .setAttribute("_KEY", keyNumber)
    .setAttribute("_LEGEND", legend)
}

async function writeModel(name, { tessellation, parts }) {
  const document = new Document(),
    buffer = document.createBuffer(),
    scene = document.createScene(name),
    instancing = createInstancing(document, parts),
    gltfMaterials = createMaterials(document, parts)

  for (const part of parts) {
    const meshed = part.shape.mesh(tessellation),
      positions = toGltf(meshed.vertices, METRES_PER_MILLIMETRE),
      normals = toGltf(meshed.normals, 1),
      triangles = new Uint32Array(meshed.triangles),
      gltfMaterial = gltfMaterials.get(part.material),
      position = createAccessor(document, buffer, "VEC3", positions),
      normal = createAccessor(document, buffer, "VEC3", normals),
      indices = createAccessor(document, buffer, "SCALAR", triangles),
      primitive = document
        .createPrimitive()
        .setAttribute("POSITION", position)
        .setAttribute("NORMAL", normal)
        .setIndices(indices)
        .setMaterial(gltfMaterial),
      mesh = document.createMesh(part.name).addPrimitive(primitive),
      node = document.createNode(part.name).setMesh(mesh),
      standsForKeys = Object.hasOwn(part, "keys"),
      mapped = Object.hasOwn(part, "mapping"),
      laidOut = Object.hasOwn(part, "face") || mapped,
      printed = Object.hasOwn(part, "print"),
      lettered = Object.hasOwn(part, "legends"),
      screened = Object.hasOwn(part, "screen"),
      placed = Object.hasOwn(part, "place"),
      turned = Object.hasOwn(part, "tilt") && !standsForKeys

    if (standsForKeys) {
      const keyInstances = createKeyInstances(document, buffer, instancing, part)

      node.setExtension("EXT_mesh_gpu_instancing", keyInstances)
    }

    if (turned) {
      const tilt = tiltAboutX(part.tilt)

      node.setRotation(tilt)
    }

    if (placed) {
      const place = toGltf(part.place, METRES_PER_MILLIMETRE),
        translation = Array.from(place)

      node.setTranslation(translation)
    }

    if (laidOut) {
      const uvs = mapped
          ? mappedUvs(meshed.vertices, part.mapping)
          : faceUvs(meshed.vertices, part.face),
        texcoord = createAccessor(document, buffer, "VEC2", uvs)

      primitive.setAttribute("TEXCOORD_0", texcoord)
    }

    const extras = {}

    if (printed) {
      extras.print = `${name}-${part.print}`
    }

    if (lettered) {
      extras.legends = `${name}-${part.legends}`
    }

    if (screened) {
      extras.screen = true
    }

    node.setExtras(extras)
    scene.addChild(node)
  }

  const path = resolve(MODELS_DIR, `${name}.glb`),
    io = new NodeIO().registerExtensions([EXTMeshGPUInstancing])

  await io.write(path, document)
  console.log(`==> Wrote ${relative(ROOT, path)}`)
}

const oc = await opencascade({ locateFile: () => KERNEL_WASM })

setOC(oc)

const models = [
  { name: "cpc6128", built: buildCpc6128() },
  { name: "ctm644", built: buildCtm644() },
  { name: "cf2", built: buildCf2() }
]

for (const model of models) {
  await writeModel(model.name, model.built)

  for (const print of model.built.prints) {
    writePrint(model.name, print)
  }
}
