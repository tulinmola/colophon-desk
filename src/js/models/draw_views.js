// The part of a frame that falls on the canvas, or null where none does.
function seenOf(frame, canvas) {
  const left = Math.max(frame.left, 0),
    top = Math.max(frame.top, 0),
    right = Math.min(frame.left + frame.width, canvas.width),
    bottom = Math.min(frame.top + frame.height, canvas.height),
    seen = right > left && bottom > top

  return seen ? { left, top, width: right - left, height: bottom - top } : null
}

// Each view is drawn by the one camera, its frame, in CSS pixels, where its
// picture stands on the canvas; a view clipped is drawn within its frame
// alone. The canvas is cleared once before them all: a clear on WebGPU reaches
// past the scissor to the whole of it.
export default function drawViews(renderer, camera, views, canvas) {
  renderer.clear()

  for (const { pose, frame, scene, clipped } of views) {
    const seen = seenOf(frame, canvas)

    if (seen) {
      pose.place(camera, frame, canvas)
      renderer.setScissorTest(clipped)
      renderer.setScissor(seen.left, seen.top, seen.width, seen.height)
      renderer.render(scene, camera)
    }
  }

  renderer.setScissorTest(false)
}
