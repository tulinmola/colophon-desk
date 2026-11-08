import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import KeycapMaterial from "./keycap_material"
import loadTexture from "./load_texture"

function printUrl(name, language) {
  return new URL(`../../assets/textures/${language}/${name}.png`, import.meta.url)
}

async function printOn(mesh, language, anisotropy) {
  const url = printUrl(mesh.userData.print, language),
    print = await loadTexture(url, anisotropy)

  mesh.material.color.setRGB(1, 1, 1)
  mesh.material.map = print

  return print
}

// Caps of one plastic share one material, and caps of every plastic one atlas
// and one travel.
async function letter(keycaps, language, anisotropy, keys) {
  const [keycap] = keycaps,
    url = printUrl(keycap.userData.legends, language),
    atlas = await loadTexture(url, anisotropy),
    settings = KeycapMaterial.settings(),
    byPlastic = Map.groupBy(keycaps, lettered => lettered.material)

  for (const [plastic, caps] of byPlastic) {
    const material = new KeycapMaterial(plastic, atlas, keys, settings)

    for (const lettered of caps) {
      lettered.material = material
    }
  }

  return { atlas, settings }
}

export default async function loadModel(url, language, anisotropy, keys) {
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
    lettering = Array.from(byAtlas.values(), keycaps => letter(keycaps, language, anisotropy, keys))

  const prints = await Promise.all(printing),
    groups = await Promise.all(lettering),
    textures = [...prints, ...groups.map(group => group.atlas)],
    [caps] = groups

  return { model: gltf.scene, textures, keyboard: caps?.settings }
}
