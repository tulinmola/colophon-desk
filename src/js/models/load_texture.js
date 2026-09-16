import { SRGBColorSpace, TextureLoader } from "three/webgpu"

// glTF lays a texture's first row at the top of its image, as the builder's prints and the emulator's pictures are made: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images
export async function loadTexture(url, anisotropy) {
  const loader = new TextureLoader(),
    texture = await loader.loadAsync(url.href)

  texture.colorSpace = SRGBColorSpace
  texture.flipY = false
  texture.anisotropy = anisotropy

  return texture
}
