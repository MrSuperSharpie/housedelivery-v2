import type { OptimizedEvidenceFile } from './types'

const DEFAULT_LONGEST_EDGE = 3200
const DEFAULT_TARGET_BYTES = 2 * 1024 * 1024
const MIN_JPEG_QUALITY = 0.62
const QUALITY_STEP = 0.08

export interface ResizeInput {
  width: number
  height: number
  maxLongestEdge?: number
}

export interface ResizeDimensions {
  width: number
  height: number
  scale: number
}

export interface ImageOptimizationPlan {
  shouldResize: boolean
  shouldCompress: boolean
  targetMimeType: 'image/jpeg'
  initialQuality: number
  minQuality: number
  targetBytes: number
}

export function calculateImageResizeDimensions({
  width,
  height,
  maxLongestEdge = DEFAULT_LONGEST_EDGE,
}: ResizeInput): ResizeDimensions {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0, scale: 1 }
  }

  const longest = Math.max(width, height)
  if (longest <= maxLongestEdge) {
    return { width, height, scale: 1 }
  }

  const scale = maxLongestEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}

export function chooseImageOptimizationPlan(input: {
  fileSize: number
  width?: number
  height?: number
  maxLongestEdge?: number
  targetBytes?: number
}): ImageOptimizationPlan {
  const targetBytes = input.targetBytes ?? DEFAULT_TARGET_BYTES
  const longest = input.width && input.height ? Math.max(input.width, input.height) : 0
  const maxLongestEdge = input.maxLongestEdge ?? DEFAULT_LONGEST_EDGE

  return {
    shouldResize: longest > maxLongestEdge,
    shouldCompress: input.fileSize > targetBytes || longest > maxLongestEdge,
    targetMimeType: 'image/jpeg',
    initialQuality: input.fileSize > 6 * 1024 * 1024 ? 0.82 : 0.86,
    minQuality: MIN_JPEG_QUALITY,
    targetBytes,
  }
}

export async function calculateSha256Hex(file: Blob): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined
  const buffer = await file.arrayBuffer()
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(chunk => chunk.toString(16).padStart(2, '0'))
    .join('')
}

function fileNameWithJpegExtension(name: string): string {
  const trimmed = name.trim() || `evidence-${new Date().toISOString()}`
  return /\.[a-z0-9]+$/i.test(trimmed)
    ? trimmed.replace(/\.[a-z0-9]+$/i, '.jpg')
    : `${trimmed}.jpg`
}

async function blobFromCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, type: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality })
  }

  return new Promise((resolve, reject) => {
    ;(canvas as HTMLCanvasElement).toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Image optimization failed to create a browser blob.'))
    }, type, quality)
  })
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  }

  if (typeof Image === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Image optimization is not supported in this browser.')
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Image could not be decoded.'))
      image.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function getImageSize(image: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return {
    width: 'width' in image ? image.width : 0,
    height: 'height' in image ? image.height : 0,
  }
}

function closeDecodedImage(image: ImageBitmap | HTMLImageElement) {
  if ('close' in image) {
    image.close()
  }
}

export async function optimizeEvidenceFile(file: File, options?: {
  maxLongestEdge?: number
  targetBytes?: number
}): Promise<OptimizedEvidenceFile> {
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalByteSize: file.size,
      optimizedByteSize: file.size,
      checksum: await calculateSha256Hex(file),
      didOptimize: false,
      note: file.type.startsWith('video/')
        ? 'Video preserved without browser-side transcoding.'
        : 'File preserved without image optimization.',
    }
  }

  let decoded: ImageBitmap | HTMLImageElement | null = null
  try {
    decoded = await decodeImage(file)
    const size = getImageSize(decoded)
    const target = calculateImageResizeDimensions({
      width: size.width,
      height: size.height,
      maxLongestEdge: options?.maxLongestEdge,
    })
    const plan = chooseImageOptimizationPlan({
      fileSize: file.size,
      width: size.width,
      height: size.height,
      maxLongestEdge: options?.maxLongestEdge,
      targetBytes: options?.targetBytes,
    })

    if (!plan.shouldCompress && !plan.shouldResize) {
      return {
        file,
        originalByteSize: file.size,
        optimizedByteSize: file.size,
        checksum: await calculateSha256Hex(file),
        didOptimize: false,
        note: 'Image was already within field-evidence size targets.',
      }
    }

    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(target.width, target.height)
      : Object.assign(document.createElement('canvas'), { width: target.width, height: target.height })
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image optimization canvas is unavailable.')
    context.drawImage(decoded, 0, 0, target.width, target.height)

    let quality = plan.initialQuality
    let blob = await blobFromCanvas(canvas, plan.targetMimeType, quality)
    while (blob.size > plan.targetBytes && quality > plan.minQuality) {
      quality = Math.max(plan.minQuality, quality - QUALITY_STEP)
      blob = await blobFromCanvas(canvas, plan.targetMimeType, quality)
    }

    const optimizedFile = new File(
      [blob],
      fileNameWithJpegExtension(file.name),
      { type: plan.targetMimeType, lastModified: file.lastModified },
    )

    return {
      file: optimizedFile,
      originalByteSize: file.size,
      optimizedByteSize: optimizedFile.size,
      checksum: await calculateSha256Hex(optimizedFile),
      didOptimize: true,
      note: `Image optimized to ${target.width}x${target.height}.`,
    }
  } finally {
    if (decoded) closeDecodedImage(decoded)
  }
}
