export const ALLOWED_RECEIPT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const

export const MAX_RECEIPT_BYTES = 3 * 1024 * 1024

const CHUNK = 0x8000

/** Base64 sin spread de N args (evita RangeError en fotos reales). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

/** Decodifica base64 de forma estricta (Buffer.from no tira en basura). */
export function decodeReceiptBase64(raw: string): Uint8Array | null {
  if (typeof raw !== "string") return null
  const cleaned = raw.replace(/\s/g, "")
  if (!cleaned || cleaned.length % 4 !== 0) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null
  try {
    const buf = Buffer.from(cleaned, "base64")
    if (buf.byteLength === 0) return null
    return buf
  } catch {
    return null
  }
}

export function isAllowedReceiptMime(mime: string): boolean {
  return (ALLOWED_RECEIPT_MIMES as readonly string[]).includes(
    mime.trim().toLowerCase()
  )
}

export function extensionForReceiptMime(mime: string): string {
  const m = mime.trim().toLowerCase()
  if (m === "image/png") return ".png"
  if (m === "image/webp") return ".webp"
  if (m === "image/heic" || m === "image/heif") return ".heic"
  return ".jpg"
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("read-failed"))
    reader.readAsDataURL(file)
  })
}

/** Comprime a JPEG max 1600px @ 0.7 (mismo patrón que orders). */
export async function compressImage(
  file: File
): Promise<{ mime: string; data: string }> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  const dataUrl = await readFileAsDataUrl(file)
  if (isHeic) {
    const mime =
      file.type === "image/heif" || /\.heif$/i.test(file.name)
        ? "image/heif"
        : file.type || "image/heic"
    return { mime, data: dataUrl.split(",")[1] ?? "" }
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("no-image"))
    i.src = dataUrl
  })
  if (img.width < 1 || img.height < 1) {
    throw new Error("no-image")
  }
  const max = 1600
  let { width, height } = img
  if (width > max || height > max) {
    const scale = max / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("no-canvas")
  }
  ctx.drawImage(img, 0, 0, width, height)
  const out = canvas.toDataURL("image/jpeg", 0.7)
  return { mime: "image/jpeg", data: out.split(",")[1] ?? "" }
}
