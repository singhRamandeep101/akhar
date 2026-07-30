import type { GlyphTemplate, Point } from './glyphTemplate'

export const DRAW_PASS_PERCENT = 72

export type ScoreResult = {
  percent: number
  passed: boolean
  detail: string
  failReason?: 'empty' | 'low'
  /** How much of the letter body your ink covered (0–100). */
  cover: number
  /** How much of your ink stayed on the letter (0–100). */
  onLetter: number
}

type BBox = { x0: number; y0: number; x1: number; y1: number; w: number; h: number }

function flattenStrokes(strokes: Point[][]): Point[] {
  const out: Point[] = []
  for (const stroke of strokes) {
    for (const p of stroke) out.push(p)
  }
  return out
}

function rasterizeStrokes(
  strokes: Point[][],
  width: number,
  height: number,
  lineWidth: number,
): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (stroke.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
    ctx.stroke()
  }
  const { data } = ctx.getImageData(0, 0, width, height)
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 20 ? 1 : 0
  return mask
}

function maskBBox(mask: Uint8Array, width: number, height: number): BBox | null {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
  }
  if (x1 < x0 || y1 < y0) return null
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Expand ink/silhouette by `radius` pixels (square dilate — fast enough at board size). */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) out[yy * width + xx] = 1
      }
    }
  }
  return out
}

/**
 * Map user ink into template space (uniform scale + translate).
 * Placement/size forgiven; aspect differences still hurt (Latin B ≠ ੳ).
 */
function alignMask(
  user: Uint8Array,
  userBox: BBox,
  targetBox: BBox,
  width: number,
  height: number,
): Uint8Array {
  const scale = Math.min(targetBox.w / Math.max(1, userBox.w), targetBox.h / Math.max(1, userBox.h))
  const drawnW = userBox.w * scale
  const drawnH = userBox.h * scale
  const ox = targetBox.x0 + (targetBox.w - drawnW) / 2
  const oy = targetBox.y0 + (targetBox.h - drawnH) / 2

  const out = new Uint8Array(width * height)
  // Inverse map: for each target pixel, sample user (fewer holes than forward splat)
  const x0 = Math.max(0, Math.floor(ox) - 1)
  const y0 = Math.max(0, Math.floor(oy) - 1)
  const x1 = Math.min(width - 1, Math.ceil(ox + drawnW) + 1)
  const y1 = Math.min(height - 1, Math.ceil(oy + drawnH) + 1)

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ux = userBox.x0 + (x - ox) / scale
      const uy = userBox.y0 + (y - oy) / scale
      const ix = Math.round(ux)
      const iy = Math.round(uy)
      if (ix < 0 || iy < 0 || ix >= width || iy >= height) continue
      if (user[iy * width + ix]) out[y * width + x] = 1
    }
  }
  return out
}

function overlapRatio(a: Uint8Array, bNear: Uint8Array): { hit: number; total: number } {
  let hit = 0
  let total = 0
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue
    total++
    if (bNear[i]) hit++
  }
  return { hit, total }
}

/**
 * Trace-style score: how well ink covers the letter body and stays on it.
 * No Latin A–Z heuristics — those mislabeled real letters.
 */
export function scoreDrawing(
  userStrokes: Point[][],
  template: GlyphTemplate,
  options?: { passPercent?: number; inkWidth?: number },
): ScoreResult {
  const passPercent = options?.passPercent ?? DRAW_PASS_PERCENT
  const inkWidth = options?.inkWidth ?? 17
  const { width, height, silhouette } = template

  if (flattenStrokes(userStrokes).length < 8) {
    return {
      percent: 0,
      cover: 0,
      onLetter: 0,
      passed: false,
      failReason: 'empty',
      detail: 'Draw more of the letter',
    }
  }

  const userMask = rasterizeStrokes(userStrokes, width, height, inkWidth)
  const userBox = maskBBox(userMask, width, height)
  const letterBox = maskBBox(silhouette, width, height)

  if (!userBox || !letterBox || userBox.w < 8 || userBox.h < 8) {
    return {
      percent: 0,
      cover: 0,
      onLetter: 0,
      passed: false,
      failReason: 'empty',
      detail: 'Draw more of the letter',
    }
  }

  const aligned = alignMask(userMask, userBox, letterBox, width, height)
  // Forgiveness for finger wobble while tracing the guide
  const slack = Math.max(5, Math.round(inkWidth * 0.45))
  const letterNear = dilate(silhouette, width, height, slack)
  const inkNear = dilate(aligned, width, height, slack)

  const coverStats = overlapRatio(silhouette, inkNear)
  const onStats = overlapRatio(aligned, letterNear)
  const cover = coverStats.total ? coverStats.hit / coverStats.total : 0
  const onLetter = onStats.total ? onStats.hit / onStats.total : 0

  // Both matter: covering the letter AND not scribbling off it
  const f1 = (2 * cover * onLetter) / (cover + onLetter + 1e-9)
  const percent = Math.round(f1 * 100)
  const coverPct = Math.round(cover * 100)
  const onPct = Math.round(onLetter * 100)
  const passed = percent >= passPercent

  return {
    percent,
    cover: coverPct,
    onLetter: onPct,
    passed,
    failReason: passed ? undefined : 'low',
    detail: `cover ${coverPct}% · on-letter ${onPct}%`,
  }
}
