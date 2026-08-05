import QRCode from "qrcode"

export async function downloadQrImage(
  business: { name: string; slug: string; logo?: string | null; primary_color?: string | null },
  origin: string,
  filename?: string
): Promise<string | null> {
  const safeSlug = business.slug.replace(/[^a-zA-Z0-9-]/g, "-")
  const name = filename ?? `qr-${safeSlug}.png`
  const url = `${origin.replace(/\/+$/, "")}/${business.slug}/loyalty`

  const qrSize = 220
  const headerHeight = 48
  const footerHeight = 44
  const padding = 16

  const qrDataUrl = await QRCode.toDataURL(url, {
    width: qrSize,
    margin: 2,
    color: { dark: "#1C1917", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  })

  const canvasWidth = qrSize + padding * 2
  const canvasHeight = headerHeight + qrSize + footerHeight + padding * 2

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.scale(2, 2)

  // Fondo blanco
  ctx.fillStyle = "#FFFFFF"
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 20)
  ctx.fill()
  ctx.clip()

  // Header brand
  const primary = business.primary_color || "#F97316"
  ctx.fillStyle = primary
  ctx.fillRect(0, 0, canvasWidth, headerHeight)

  // Logo / ícono en header
  if (business.logo) {
    try {
      const logoImg = await loadImage(business.logo)
      const logoSize = 32
      ctx.save()
      roundRect(ctx, padding, 8, logoSize, logoSize, 10)
      ctx.clip()
      ctx.drawImage(logoImg, padding, 8, logoSize, logoSize)
      ctx.restore()
    } catch {
      drawSandwichIcon(ctx, padding, 8, 32)
    }
  } else {
    drawSandwichIcon(ctx, padding, 8, 32)
  }

  // Nombre en header
  ctx.fillStyle = "#FFFFFF"
  ctx.font = "bold 12px Inter, sans-serif"
  const maxTextWidth = canvasWidth - padding * 2 - 40
  ctx.fillText(truncateText(ctx, business.name, maxTextWidth), padding + 40, 22)
  ctx.font = "11px Inter, sans-serif"
  ctx.fillStyle = "#FFEDD5"
  ctx.fillText("Fidelización", padding + 40, 38)

  // QR
  const qrImg = await loadImage(qrDataUrl)
  ctx.drawImage(qrImg, padding, headerHeight + padding, qrSize, qrSize)

  // Footer
  const footerY = headerHeight + qrSize + padding
  ctx.fillStyle = "#F5F5F4"
  ctx.fillRect(0, footerY, canvasWidth, footerHeight)
  ctx.fillStyle = "#78716C"
  ctx.font = "600 11px Inter, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("Sumá compras · ganá premios", canvasWidth / 2, footerY + 18)
  ctx.fillStyle = primary
  ctx.fillText(truncateText(ctx, url.replace(/^https?:\/\//, ""), maxTextWidth), canvasWidth / 2, footerY + 34)
  ctx.textAlign = "start"

  // Borde
  ctx.strokeStyle = "#E7E5E4"
  ctx.lineWidth = 1
  ctx.beginPath()
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 20)
  ctx.stroke()

  // Descarga
  const dataUrl = canvas.toDataURL("image/png")
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  return name
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let truncated = text
  while (ctx.measureText(truncated).width > maxWidth && truncated.length > 4) {
    truncated = truncated.slice(0, -4) + "…"
  }
  return truncated
}

function drawSandwichIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = 10
  ctx.save()
  ctx.fillStyle = "#FFFFFF"
  roundRect(ctx, x, y, size, size, r)
  ctx.fill()
  ctx.fillStyle = "#F97316"
  ctx.font = `${size * 0.56}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("🍔", x + size / 2, y + size / 2)
  ctx.textAlign = "start"
  ctx.textBaseline = "alphabetic"
  ctx.restore()
}
