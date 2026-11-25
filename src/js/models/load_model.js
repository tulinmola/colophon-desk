import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import KeycapMaterial from "./keycap_material"
import loadTexture from "./load_texture"

// Each model's prints are in the language of the units it was drawn from: the
// Spanish CPCs with their monitor and disc, and the English Spectrum.
const MODELS = {
  cpc6128: { url: new URL("../../assets/models/cpc6128.glb", import.meta.url), language: "es" },
  cpc464: { url: new URL("../../assets/models/cpc464.glb", import.meta.url), language: "es" },
  spectrum48: {
    url: new URL("../../assets/models/spectrum48.glb", import.meta.url),
    language: "en"
  },
  ctm644: { url: new URL("../../assets/models/ctm644.glb", import.meta.url), language: "es" },
  cf2: { url: new URL("../../assets/models/cf2.glb", import.meta.url), language: "es" }
}

function printUrl(name, language, keys) {
  const played = Boolean(keys)

  if (played) {
    return new URL(`../../assets/textures/${language}/${name}.png`, import.meta.url)
  }

  return new URL(`../../assets/textures/${language}/small/${name}.png`, import.meta.url)
}

async function printOn(mesh, language, anisotropy, keys) {
  const url = printUrl(mesh.userData.print, language, keys),
    print = await loadTexture(url, anisotropy)

  mesh.material.color.setRGB(1, 1, 1)
  mesh.material.map = print

  return print
}

// Caps of one plastic share one material, and caps of every plastic one atlas
// and one travel.
async function letter(keycaps, language, anisotropy, keys) {
  const [keycap] = keycaps,
    url = printUrl(keycap.userData.legends, language, keys),
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

// A model shown and not played is loaded without keys, and none of its caps goes down.
export default async function loadModel(name, anisotropy, keys) {
  const { url, language } = MODELS[name],
    loader = new GLTFLoader(),
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
    printing = printed.map(mesh => printOn(mesh, language, anisotropy, keys)),
    lettering = Array.from(byAtlas.values(), keycaps => letter(keycaps, language, anisotropy, keys))

  const prints = await Promise.all(printing),
    groups = await Promise.all(lettering),
    textures = [...prints, ...groups.map(group => group.atlas)],
    [caps] = groups

  return { model: gltf.scene, textures, keyboard: caps?.settings }
}
