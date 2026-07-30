import { parse, type Font, type Path } from 'opentype.js'
import { assetUrl } from './audio'

const FONT_URL = assetUrl('/fonts/NotoSansGurmukhi-Bold.ttf')

export type Point = { x: number; y: number }

export type GlyphTemplate = {
  glyph: string
  width: number
  height: number
  /**
   * Demo strokes = center paths through the letter body (scanline midpoints),
   * NOT font outline edges. Drawn with a thick brush clipped to the silhouette.
   */
  demoStrokes: Point[][]
  /** Flattened centerline used for Procrustes curve matching (not pixel overlap). */
  referenceCurve: Point[]
  brushWidth: number
  silhouette: Uint8Array
}

let fontPromise: Promise<Font> | null = null

export function loadGurmukhiFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const res = await fetch(FONT_URL)
      if (!res.ok) throw new Error(`Font fetch failed (${res.status})`)
      const buffer = await res.arrayBuffer()
      return parse(buffer) as Font
    })().catch((err) => {
      fontPromise = null
      throw err
    })
  }
  return fontPromise
}

function rasterizeSilhouette(
  path: Path,
  width: number,
  height: number,
  scale: number,
  ox: number,
  oy: number,
): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#000'
  path.draw(ctx)
  ctx.fill()
  ctx.restore()

  const { data } = ctx.getImageData(0, 0, width, height)
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4 + 3] > 20 ? 1 : 0
  }
  return mask
}

type Run = { y: number; x0: number; x1: number; cx: number }

/** Horizontal ink runs per row — the natural “body” of the glyph. */
function collectRuns(mask: Uint8Array, w: number, h: number): Run[] {
  const runs: Run[] = []
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      while (x < w && !mask[y * w + x]) x++
      if (x >= w) break
      const x0 = x
      while (x < w && mask[y * w + x]) x++
      const x1 = x - 1
      runs.push({ y, x0, x1, cx: (x0 + x1) / 2 })
    }
  }
  return runs
}

/**
 * Link runs into vertical centerline strokes (top → bottom).
 * Prefer continuing into the nearest overlapping run on the next rows.
 */
function runsToStrokes(runs: Run[], maxGap = 3): Point[][] {
  if (!runs.length) return []

  const byY = new Map<number, Run[]>()
  for (const r of runs) {
    const list = byY.get(r.y) ?? []
    list.push(r)
    byY.set(r.y, list)
  }
  const ys = [...byY.keys()].sort((a, b) => a - b)

  const used = new Set<Run>()
  const strokes: Point[][] = []

  const unusedOnRow = (y: number) => (byY.get(y) ?? []).filter((r) => !used.has(r))

  for (const y0 of ys) {
    for (const start of unusedOnRow(y0)) {
      if (used.has(start)) continue
      used.add(start)
      const stroke: Point[] = [{ x: start.cx + 0.5, y: start.y + 0.5 }]
      let cur = start

      for (let yi = ys.indexOf(y0) + 1; yi < ys.length; yi++) {
        const y = ys[yi]
        if (y - cur.y > maxGap) break
        const candidates = unusedOnRow(y).filter((r) => r.x1 >= cur.x0 - 2 && r.x0 <= cur.x1 + 2)
        if (!candidates.length) {
          if (y - cur.y > 1) break
          continue
        }
        candidates.sort((a, b) => Math.abs(a.cx - cur.cx) - Math.abs(b.cx - cur.cx))
        const next = candidates[0]
        used.add(next)
        stroke.push({ x: next.cx + 0.5, y: next.y + 0.5 })
        cur = next
      }

      if (stroke.length >= 4) strokes.push(simplify(stroke, 2))
    }
  }

  // Top-to-bottom, then left-to-right (closer to writing flow than skeleton chaos)
  strokes.sort((a, b) => {
    const ay = a[0]?.y ?? 0
    const by = b[0]?.y ?? 0
    if (Math.abs(ay - by) > 10) return ay - by
    return (a[0]?.x ?? 0) - (b[0]?.x ?? 0)
  })

  return strokes
}

function simplify(points: Point[], minDist: number): Point[] {
  if (points.length < 2) return points
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const p = out[out.length - 1]
    if (Math.hypot(points[i].x - p.x, points[i].y - p.y) >= minDist) out.push(points[i])
  }
  const last = points[points.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

function estimateBrushWidth(runs: Run[]): number {
  if (!runs.length) return 14
  const widths = runs.map((r) => r.x1 - r.x0 + 1).sort((a, b) => a - b)
  const mid = widths[Math.floor(widths.length * 0.55)] ?? 12
  // Slightly under full stem so the clip-to-silhouette still shows letter edges
  return Math.max(10, Math.min(36, mid * 0.92))
}

export async function buildGlyphTemplate(
  glyphChar: string,
  width: number,
  height: number,
): Promise<GlyphTemplate> {
  const font = await loadGurmukhiFont()
  const unitPath = font.charToGlyph(glyphChar).getPath(0, 0, 200)
  const box = unitPath.getBoundingBox()
  const uw = Math.max(1, box.x2 - box.x1)
  const uh = Math.max(1, box.y2 - box.y1)
  const pad = Math.min(width, height) * 0.14
  const s = Math.min((width - pad * 2) / uw, (height - pad * 2) / uh)
  const tx = (width - uw * s) / 2 - box.x1 * s
  const ty = (height - uh * s) / 2 - box.y1 * s

  const silhouette = rasterizeSilhouette(unitPath, width, height, s, tx, ty)
  const runs = collectRuns(silhouette, width, height)
  const demoStrokes = runsToStrokes(runs)
  const brushWidth = estimateBrushWidth(runs)

  if (!demoStrokes.length) {
    // Absolute fallback: top→bottom through bbox center
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!silhouette[y * width + x]) continue
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
    const cx = (minX + maxX) / 2
    const pts: Point[] = []
    for (let y = minY; y <= maxY; y += 2) pts.push({ x: cx, y: y + 0.5 })
    demoStrokes.push(pts)
  }

  const referenceCurve: Point[] = []
  for (const stroke of demoStrokes) {
    for (const p of stroke) referenceCurve.push({ x: p.x, y: p.y })
  }

  return {
    glyph: glyphChar,
    width,
    height,
    demoStrokes,
    referenceCurve,
    brushWidth,
    silhouette,
  }
}
