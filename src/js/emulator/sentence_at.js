const TEXT = new TextDecoder()

// A sentence the host wrote into the module's memory, ended by a zero, or
// none where it handed back no address.
export default function sentenceAt(heap, at) {
  const reported = at != 0

  if (!reported) {
    return null
  }

  const end = heap.indexOf(0, at),
    sentence = heap.subarray(at, end)

  return TEXT.decode(sentence)
}
