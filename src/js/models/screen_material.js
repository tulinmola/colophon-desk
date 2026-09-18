import { Box2, MeshBasicNodeMaterial, Vector2, Vector3 } from "three/webgpu"
import { Fn, If, dFdx, dFdy, float, fwidth, mix, texture, uniform, uv, vec2, vec3 } from "three/tsl"

// The capture repeats each of its 312 raster lines twice [A], colophon-emulator/docs/command-line.en.md, --full-raster.
const ROWS_PER_LINE = 2

// Trial slot fill; the CTM644 slot proportions remain unmeasured.
const SLOT_FILL = 0.8

// One channel of three; each slot covers SLOT_FILL of its pitch both ways.
const MASK_MEAN = (SLOT_FILL * SLOT_FILL) / 3

// Counted over the halved horizontal coordinate, whose period spans two phosphor pitches. Neither is tunable: the mask stops tiling and MASK_MEAN stops matching if either moves.
const COLUMNS = 6,
  ROWS = 2

// Tuned by eye; no measurement stands behind any of them.
const SLOT_CUTOFF = [0.5, 1],
  SPREAD_CUTOFF = [1, 4],
  LINE_CUTOFF = [0.35, 1]

function surfaceMapping(geometry) {
  const coordinates = geometry.getAttribute("uv"),
    bounds = new Box2(),
    point = new Vector2(),
    span = new Vector2(),
    centre = new Vector2(),
    size = new Vector3()

  for (let index = 0; index < coordinates.count; index++) {
    point.fromBufferAttribute(coordinates, index)
    bounds.expandByPoint(point)
  }

  geometry.computeBoundingBox()
  geometry.boundingBox.getSize(size)
  bounds.getSize(span)
  bounds.getCenter(centre)

  const millimetres = new Vector2(size.x, size.z).multiplyScalar(1000).divide(span),
    origin = new Vector2(geometry.boundingBox.min.x, geometry.boundingBox.min.z).multiplyScalar(
      1000
    ),
    offset = bounds.min.clone().multiply(millimetres)

  origin.sub(offset)

  return { millimetres, origin, centre }
}

function pulseIntegral(coordinate, duty) {
  const shifted = coordinate.add(duty / 2),
    whole = shifted.floor(),
    part = shifted.fract().min(duty)

  return whole.mul(duty).add(part)
}

// A box average over a pixel still leaves energy above its Nyquist rate: https://pbr-book.org/4ed/Textures_and_Materials/Texture_Sampling_and_Antialiasing
function slotCoverage(coordinate, footprint, duty, repeats) {
  const span = footprint.max(0.00001),
    half = span.mul(0.5),
    left = coordinate.sub(half),
    right = coordinate.add(half),
    before = pulseIntegral(left, duty),
    after = pulseIntegral(right, duty),
    coverage = after.sub(before).div(span),
    unresolved = span.mul(repeats).smoothstep(...SLOT_CUTOFF)

  return mix(coverage, duty, unresolved)
}

function phosphors(at) {
  const span = fwidth(at),
    horizontalFootprint = span.x.mul(0.5),
    horizontalUnresolved = horizontalFootprint.mul(COLUMNS).greaterThanEqual(SLOT_CUTOFF[1]),
    verticalUnresolved = span.y.mul(ROWS).greaterThanEqual(SLOT_CUTOFF[1]),
    unresolved = horizontalUnresolved.and(verticalUnresolved),
    resolved = unresolved.not()

  const illuminate = Fn(function () {
    const light = vec3(MASK_MEAN).toVar()

    If(resolved, function () {
      const vertical = [at.y, at.y.add(0.5)],
        down = vertical.map(coordinate => slotCoverage(coordinate, span.y, SLOT_FILL, ROWS)),
        channels = []

      for (let channel = 0; channel < 3; channel++) {
        const columns = []

        for (let parity = 0; parity < 2; parity++) {
          const horizontal = at.x.sub((channel + 0.5) / 3 + parity).mul(0.5),
            across = slotCoverage(horizontal, horizontalFootprint, SLOT_FILL / COLUMNS, COLUMNS),
            lit = across.mul(down[parity])

          columns.push(lit)
        }

        const emitted = columns[0].add(columns[1])

        channels.push(emitted)
      }

      const detailed = vec3(...channels)

      light.assign(detailed)
    })

    return light
  })

  return illuminate()
}

// CRT spot size and video bandwidth both spread the signal spatially, AAPM TG18 §2.3.1.3: https://www.aapm.org/pubs/reports/OR_03.pdf
function horizontalLight(picture, at, gradientX, gradientY, width) {
  const source = texture(picture, at).grad(gradientX, gradientY),
    across = gradientX.x.abs(),
    down = gradientY.x.abs(),
    footprint = across.add(down),
    gaussianOffset = Math.sqrt(3),
    sigma = width.max(0.000001),
    relativeFootprint = footprint.div(sigma),
    visible = relativeFootprint.smoothstep(...SPREAD_CUTOFF).oneMinus(),
    positiveWidth = width.greaterThan(0),
    resolved = visible.greaterThan(0),
    spreading = positiveWidth.and(resolved)

  const reconstruct = Fn(function () {
    const light = source.rgb.toVar()

    If(spreading, function () {
      const distance = width.mul(gaussianOffset),
        offset = vec2(distance, 0),
        before = at.sub(offset),
        after = at.add(offset),
        left = texture(picture, before).grad(gradientX, gradientY),
        right = texture(picture, after).grad(gradientX, gradientY),
        sides = left.rgb.add(right.rgb),
        centre = source.rgb.mul(4),
        blurred = sides.add(centre).div(6),
        filtered = mix(source.rgb, blurred, visible)

      light.assign(filtered)
    })

    return light
  })

  return { light: reconstruct(), source: source.rgb }
}

function pictureLight(picture, at, width, horizontalWidth) {
  const lines = picture.image.height / ROWS_PER_LINE,
    gradientX = dFdx(at).toVar(),
    gradientY = dFdy(at).toVar(),
    footprint = fwidth(at).y.mul(lines),
    unresolved = footprint.smoothstep(...LINE_CUTOFF),
    variance = width.mul(width),
    neighbour = variance.reciprocal().mul(-0.5).exp(),
    nextNeighbour = variance.reciprocal().mul(-2).exp(),
    tails = neighbour.add(nextNeighbour).mul(2),
    peak = tails.add(1),
    gaussianArea = Math.sqrt(2 * Math.PI),
    mean = width.mul(gaussianArea).div(peak),
    horizontal = horizontalLight(picture, at, gradientX, gradientY, horizontalWidth),
    average = horizontal.light.mul(mean)

  // Snapped rows require unsnapped gradients for mip selection: https://threejs.org/docs/pages/TextureNode.html#grad
  const reconstruct = Fn(function () {
    const light = average.toVar(),
      resolved = unresolved.lessThan(1)

    If(resolved, function () {
      const line = at.y.mul(lines).sub(0.5),
        nearest = line.floor(),
        pixelVariance = footprint.mul(footprint).div(12),
        spread = variance.add(pixelVariance).sqrt(),
        amplitude = width.div(spread).div(peak),
        contributions = []

      for (let offset = -1; offset <= 2; offset++) {
        const row = nearest.add(offset),
          distance = line.sub(row).div(spread),
          weight = distance.mul(distance).mul(-0.5).exp().mul(amplitude),
          vertical = row.add(0.5).div(lines),
          sampleAt = vec2(at.x, vertical),
          sample = horizontalLight(picture, sampleAt, gradientX, gradientY, horizontalWidth),
          belowLast = row.lessThan(lines),
          inside = row.greaterThanEqual(0).and(belowLast),
          coverage = float(inside),
          emitted = sample.light.mul(weight),
          contribution = emitted.mul(coverage)

        contributions.push(contribution)
      }

      const detailed = contributions.reduce((sum, contribution) => sum.add(contribution)),
        filtered = mix(detailed, average, unresolved)

      light.assign(filtered)
    })

    return light
  })

  return { light: reconstruct(), source: horizontal.source, mean }
}

function glowLight(picture, at, radius, source) {
  const gradientX = dFdx(at).toVar(),
    gradientY = dFdy(at).toVar(),
    footprint = fwidth(at),
    relative = footprint.div(radius),
    shortest = relative.x.min(relative.y),
    visible = shortest.smoothstep(...SPREAD_CUTOFF).oneMinus(),
    resolved = visible.greaterThan(0)

  const convolve = Fn(function () {
    const light = source.toVar()

    If(resolved, function () {
      const gaussianOffset = Math.sqrt(3),
        step = radius.mul(gaussianOffset),
        centre = source.mul(16 / 36),
        contributions = [centre]

      // Informed by CRT-Royale's cheaper bloom: https://docs.libretro.com/shader/crt_royale/#preset-versions
      for (let row = -1; row <= 1; row++) {
        for (let column = -1; column <= 1; column++) {
          const central = row == 0 && column == 0

          if (central) {
            continue
          }

          const displacement = vec2(column, row).mul(step),
            sampleAt = at.add(displacement),
            sample = texture(picture, sampleAt).grad(gradientX, gradientY),
            afterStart = sampleAt.greaterThanEqual(0).all(),
            beforeEnd = sampleAt.lessThanEqual(1).all(),
            inside = afterStart.and(beforeEnd),
            coverage = float(inside),
            horizontalWeight = column == 0 ? 4 : 1,
            verticalWeight = row == 0 ? 4 : 1,
            weight = (horizontalWeight * verticalWeight) / 36,
            weighted = sample.rgb.mul(weight),
            contribution = weighted.mul(coverage)

          contributions.push(contribution)
        }
      }

      const blurred = contributions.reduce((sum, contribution) => sum.add(contribution)),
        filtered = mix(source, blurred, visible)

      light.assign(filtered)
    })

    return light
  })

  return convolve()
}

export default class ScreenMaterial extends MeshBasicNodeMaterial {
  // CTM644 macro photographs show segmented RGB columns [D]: http://cpc.sylvestre.org/technique/technique_gfx8.html
  // Ten green columns there across seven Mode 1 pixels is 1.4 capture samples to a triad, and the sweep is laid 308.0 mm across its 800 sampled columns, so 0.385 mm a sample gives the 0.54 below [E].
  // Every other tube figure here is a trial setting tuned by eye, not a measured property.
  settings = {
    phosphorPitch: uniform(0.54),
    slotPitch: uniform(0.65),
    scanlineWidth: uniform(0.3),
    excitationWidth: uniform(0.18),
    glowRadius: uniform(0.35),
    glow: uniform(0.35),
    compensation: uniform(1),
    pictureWidth: uniform(1),
    pictureHeight: uniform(1),
    pictureX: uniform(0),
    pictureY: uniform(0),
    light: uniform(0.55),
    enabled: uniform(1)
  }

  constructor(geometry, picture) {
    super()

    const settings = this.settings,
      surface = surfaceMapping(geometry),
      at = uv(),
      centre = vec2(surface.centre),
      scale = vec2(settings.pictureWidth, settings.pictureHeight),
      offset = vec2(settings.pictureX, settings.pictureY),
      pictureAt = at.sub(centre).sub(offset).div(scale).add(centre),
      pitch = vec2(settings.phosphorPitch, settings.slotPitch),
      millimetres = vec2(surface.millimetres),
      origin = vec2(surface.origin),
      physical = at.mul(millimetres).add(origin).div(pitch),
      horizontalWidth = settings.excitationWidth.div(millimetres.x).div(settings.pictureWidth),
      radius = settings.glowRadius.div(millimetres).div(scale),
      pictureLightAt = pictureLight(picture, pictureAt, settings.scanlineWidth, horizontalWidth),
      mask = phosphors(physical),
      mean = pictureLightAt.mean.mul(MASK_MEAN),
      compensation = mean.reciprocal(),
      gain = mix(1, compensation, settings.compensation),
      peak = gain.mul(settings.light),
      afterStart = pictureAt.greaterThanEqual(0).all(),
      beforeEnd = pictureAt.lessThanEqual(1).all(),
      inside = afterStart.and(beforeEnd),
      coverage = float(inside),
      source = pictureLightAt.source.mul(coverage),
      direct = pictureLightAt.light.mul(mask).mul(peak),
      core = direct.mul(coverage),
      combine = Fn(function () {
        const emitted = core.toVar(),
          glowing = settings.glow.greaterThan(0),
          compensating = settings.compensation.greaterThan(0),
          spreading = glowing.or(compensating)

        If(spreading, function () {
          const averaged = glowLight(picture, pictureAt, radius, source),
            halo = averaged.mul(mean).mul(peak),
            headroom = halo.oneMinus().max(0),
            contrast = peak.sub(halo).max(0.00001),
            allowed = headroom.div(contrast).clamp(0, 1),
            retained = settings.glow.oneMinus().min(allowed),
            combined = mix(halo, core, retained)

          // Bloom rationale: https://docs.libretro.com/shader/crt_royale/#is-this-phosphor-bloom-realistic
          emitted.assign(combined)
        })

        return emitted
      }),
      emitted = combine()

    this.picture = picture
    this.colorNode = mix(source, emitted, settings.enabled)
    this.toneMapped = false
  }
}
