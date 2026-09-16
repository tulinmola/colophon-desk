import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { createKeycapMaterial } from "./keycap_material"
import { loadTexture } from "./load_texture"

function printUrl(name, language) {
  return new URL(`../../assets/textures/${language}/${name}.png`, import.meta.url)
}

async function printOn(mesh, language, anisotropy) {
  const url = printUrl(mesh.userData.print, language),
    print = await loadTexture(url, anisotropy)

  mesh.material.color.setRGB(1, 1, 1)
  mesh.material.map = print
}

async function letter(keycaps, language, anisotropy) {
  const [keycap] = keycaps,
    url = printUrl(keycap.userData.legends, language),
    atlas = await loadTexture(url, anisotropy),
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
