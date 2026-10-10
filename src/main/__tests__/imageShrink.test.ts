import { describe, expect, test, vi } from 'vitest'
import { imageWidth, makeShrinker, type NativeImageLike } from '../imageShrink'

/** A PNG header: signature, IHDR, then width and height */
function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes)
  bytes.writeUInt32BE(13, 8)
  bytes.write('IHDR', 12, 'ascii')
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  return bytes
}

/** A JPEG with an APP0 segment before its frame header */
function jpegHeader(width: number, height: number): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.alloc(14)])
  const frame = Buffer.alloc(19)
  frame.writeUInt16BE(0xffc0, 0)
  frame.writeUInt16BE(17, 2)
  frame[4] = 8
  frame.writeUInt16BE(height, 5)
  frame.writeUInt16BE(width, 7)
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, frame])
}

describe('imageWidth', () => {
  test('reads a PNG and a JPEG without decoding them', () => {
    expect(imageWidth(pngHeader(1200, 1600), 'image/png')).toBe(1200)
    expect(imageWidth(jpegHeader(1200, 1600), 'image/jpeg')).toBe(1200)
  })

  test('says nothing about other formats or broken files', () => {
    expect(imageWidth(pngHeader(10, 10), 'image/webp')).toBeUndefined()
    expect(imageWidth(Buffer.from('not an image'), 'image/png')).toBeUndefined()
    expect(
      imageWidth(Buffer.from([0xff, 0xd8, 0x00]), 'image/jpeg')
    ).toBeUndefined()
  })
})

function fakeNative(output: Buffer) {
  const resize = vi.fn(() => ({
    toJPEG: vi.fn(() => output),
    toPNG: vi.fn(() => output)
  }))
  const createFromBuffer = vi.fn(() => ({ isEmpty: () => false, resize }))
  return {
    native: { createFromBuffer } as NativeImageLike,
    createFromBuffer,
    resize
  }
}

describe('makeShrinker', () => {
  const options = { maxWidth: 600, quality: 80 }

  test('scales a wide picture down to the width and keeps its format', () => {
    const { native, resize } = fakeNative(Buffer.from('small'))

    const shrink = makeShrinker(native, options)
    expect(shrink(pngHeader(1200, 1600), 'image/png')?.toString()).toBe('small')
    expect(shrink(jpegHeader(1200, 1600), 'image/jpeg')?.toString()).toBe(
      'small'
    )
    expect(resize).toHaveBeenCalledWith({ width: 600, quality: 'best' })
  })

  test('leaves alone what already fits, and what it cannot read, without decoding', () => {
    const { native, createFromBuffer } = fakeNative(Buffer.from('small'))
    const shrink = makeShrinker(native, options)

    expect(shrink(pngHeader(600, 800), 'image/png')).toBeUndefined()
    expect(shrink(jpegHeader(300, 400), 'image/jpeg')).toBeUndefined()
    expect(shrink(Buffer.from('x'), 'image/gif')).toBeUndefined()
    expect(createFromBuffer).not.toHaveBeenCalled()
  })

  test('gives nothing when the image does not decode or comes out empty', () => {
    const empty = {
      createFromBuffer: () => ({ isEmpty: () => true })
    } as unknown as NativeImageLike
    expect(
      makeShrinker(empty, options)(pngHeader(1200, 1600), 'image/png')
    ).toBeUndefined()

    const { native } = fakeNative(Buffer.alloc(0))
    expect(
      makeShrinker(native, options)(pngHeader(1200, 1600), 'image/png')
    ).toBeUndefined()
  })
})
