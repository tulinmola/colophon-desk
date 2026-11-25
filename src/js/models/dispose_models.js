export default function disposeModels(models, loadedTextures) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(loadedTextures)

  for (const model of models) {
    model.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        geometries.add(object.geometry)
        materials.add(object.material)
      }
    })
  }

  for (const material of materials) {
    const mapped = Boolean(material.map)

    if (mapped) {
      textures.add(material.map)
    }
  }

  for (const geometry of geometries) {
    geometry.dispose()
  }

  for (const texture of textures) {
    texture.dispose()
  }

  for (const material of materials) {
    material.dispose()
  }
}
