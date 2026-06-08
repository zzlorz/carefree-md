const MAX_WIDTH = 1200
const JPEG_QUALITY = 0.82
const PNG_SKIP_THRESHOLD = 200 * 1024  // skip compression for small PNGs

export function generateImageId(): string {
  const raw = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  return `file_${raw}`
}

export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/gif':  'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  return map[mimeType] ?? 'jpg'
}

export async function compressImage(file: File): Promise<Blob> {
  // Skip compression for small PNGs — they're likely icons/diagrams
  if (file.type === 'image/png' && file.size < PNG_SKIP_THRESHOLD) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
