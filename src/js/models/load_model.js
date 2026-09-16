import { SRGBColorSpace, TextureLoader } from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { createKeycapMaterial } from "./keycap_material"

// glTF lays a texture's first row at the top of its image, as the builder's prints are made: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images
async function loadPrint(name, language, anisotropy) {
  const loader = new TextureLoader(),
    url = new URL(`../../assets/textures/${language}/${name}.png`, import.meta.url),
    print = await loader.loadAsync(url.href)

  print.colorSpace = SRGBColorSpace
  print.flipY = false
  print.anisotropy = anisotropy

  return print
}

async function printOn(mesh, language, anisotropy) {
  const print = await loadPrint(mesh.userData.print, language, anisotropy)

  mesh.material.color.setRGB(1, 1, 1)
  mesh.material.map = print
}

async function letter(keycaps, language, anisotropy) {
  const [keycap] = keycaps,
    atlas = await loadPrint(keycap.userData.legends, language, anisotropy),
    material = createKeycapMaterial(keycap.material, atlas)

  for (const lettered of keycaps) {
    lettered.material = material
  }
}

export async function loadModel(url, language, anisotropy) {
  const loader = new GLTFLoader(),
    gltf = await loader.loadAsync(url.href),
    printed = [],
    lettered = []

  gltf.scene.traverse(function (object) {
    const hasPrint = Object.hasOwn(object.userData, "print"),
      hasLegends = Object.hasOwn(object.userData, "legends")

    if (hasPrint) {
      printed.push(object)
    }

    if (hasLegends) {
      lettered.push(object)
    }
  })

  const byAtlas = Map.groupBy(lettered, keycap => keycap.userData.legends),
    printing = printed.map(mesh => printOn(mesh, language, anisotropy)),
    lettering = Array.from(byAtlas.values(), keycaps => letter(keycaps, language, anisotropy))

  await Promise.all([...printing, ...lettering])

  return gltf.scene
}
