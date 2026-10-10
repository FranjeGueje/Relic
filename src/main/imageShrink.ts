/** Width of a PNG or JPEG read from its header, without decoding it; undefined for anything else */
export function imageWidth(bytes: Buffer, type: string): number | undefined {
  if (type === 'image/png') {
    // signature (8) + IHDR length and name (8), then width and height as 32-bit big endian
    return bytes.length >= 24 && bytes.readUInt32BE(12) === 0x49484452
      ? bytes.readUInt32BE(16)
      : undefined
  }
  if (type === 'image/jpeg') {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return undefined
      const marker = bytes[offset + 1]
      // Start of frame (but not the tables that share the range): height, then width
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      )
        return bytes.readUInt16BE(offset + 7)
      offset += 2 + bytes.readUInt16BE(offset + 2)
    }
  }
  return undefined
}

/** What the shrinker needs of Electron's `nativeImage` (so it can be tested without Electron) */
export type NativeImageLike = {
  createFromBuffer(bytes: Buffer): {
    isEmpty(): boolean
    resize(options: { width: number; quality: 'best' }): {
      toJPEG(quality: number): Buffer
      toPNG(): Buffer
    }
  }
}

/**
 * Makes a smaller copy of a cover: wider than `maxWidth` it is scaled down to that width (never
 * up), and a JPEG is saved again at `quality`. The format stays the same (PNG keeps its alpha).
 * Pictures that are not PNG or JPEG, that already fit, or that fail to decode give `undefined`.
 */
export function makeShrinker(
  nativeImage: NativeImageLike,
  { maxWidth, quality }: { maxWidth: number; quality: number }
): (bytes: Buffer, type: string) => Buffer | undefined {
  return (bytes, type) => {
    const width = imageWidth(bytes, type)
    if (width === undefined || width <= maxWidth) return undefined
    const image = nativeImage.createFromBuffer(bytes)
    if (image.isEmpty()) return undefined
    const resized = image.resize({ width: maxWidth, quality: 'best' })
    const smaller =
      type === 'image/jpeg' ? resized.toJPEG(quality) : resized.toPNG()
    return smaller.length > 0 ? smaller : undefined
  }
}
