export const createArrowImage = (
  size = 32,
  rgb: readonly [number, number, number] = [31, 41, 55],
) => {
  const data = new Uint8Array(size * size * 4)
  const center = size / 2
  const headLength = size * 0.4
  const headHalfWidth = size * 0.3
  const shaftHalfWidth = size * 0.08

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.abs(x + 0.5 - center)
      const top = y + 0.5
      const inHead = top <= headLength && dx <= (headHalfWidth * top) / headLength
      const inShaft = top > headLength && top < size - 1 && dx <= shaftHalfWidth
      if (!inHead && !inShaft) continue
      const offset = (y * size + x) * 4
      data[offset] = rgb[0]
      data[offset + 1] = rgb[1]
      data[offset + 2] = rgb[2]
      data[offset + 3] = 255
    }
  }

  return { width: size, height: size, data }
}
