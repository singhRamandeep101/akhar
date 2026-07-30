import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import { scoreDrawing, DRAW_PASS_PERCENT, type ScoreResult } from '../lib/drawingScore'
import { buildGlyphTemplate, type GlyphTemplate, type Point } from '../lib/glyphTemplate'

export type DrawingBoardHandle = {
  clear: () => void
  replayDemo: () => void
  check: () => ScoreResult | null
}

type Props = {
  ghostGlyph: string
  className?: string
  onScore?: (result: ScoreResult) => void
  autoDemo?: boolean
  /** When false, blank board (memory practice). Default true for graded trace. */
  showGuide?: boolean
}

type Stroke = Point[]

/** User pen — intentionally chunky for finger/mouse tracing. */
const USER_INK_WIDTH = 14

export const DrawingBoard = forwardRef<DrawingBoardHandle, Props>(function DrawingBoard(
  { ghostGlyph, className = '', onScore, autoDemo = true, showGuide = true },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const strokesRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke>([])
  const templateRef = useRef<GlyphTemplate | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const setupGen = useRef(0)
  const demoRaf = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastScore, setLastScore] = useState<ScoreResult | null>(null)

  const stopDemo = () => {
    if (demoRaf.current != null) {
      cancelAnimationFrame(demoRaf.current)
      demoRaf.current = null
    }
    setDemoPlaying(false)
  }

  const paintBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#f3efe6'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(26, 47, 26, 0.12)'
    ctx.lineWidth = 1
    const mid = h * 0.32
    ctx.beginPath()
    ctx.moveTo(16, mid)
    ctx.lineTo(w - 16, mid)
    ctx.stroke()
  }

  /** Faint letter body to trace — same silhouette used for scoring. */
  const paintGhost = (ctx: CanvasRenderingContext2D, template: GlyphTemplate) => {
    const { width, height, silhouette } = template
    const img = ctx.getImageData(0, 0, width, height)
    for (let i = 0; i < silhouette.length; i++) {
      if (!silhouette[i]) continue
      const o = i * 4
      img.data[o] = Math.round(img.data[o] * 0.88 + 26 * 0.12)
      img.data[o + 1] = Math.round(img.data[o + 1] * 0.88 + 47 * 0.12)
      img.data[o + 2] = Math.round(img.data[o + 2] * 0.88 + 26 * 0.12)
      img.data[o + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }

  const paintFillReveal = (ctx: CanvasRenderingContext2D, template: GlyphTemplate, revealY: number) => {
    const { width, height, silhouette } = template
    const img = ctx.getImageData(0, 0, width, height)
    const yMax = Math.min(height, Math.max(0, Math.floor(revealY)))
    for (let y = 0; y < yMax; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (!silhouette[i]) continue
        const o = i * 4
        img.data[o] = 15
        img.data[o + 1] = 107
        img.data[o + 2] = 92
        img.data[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)

    if (yMax > 0 && yMax < height) {
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(12, yMax)
      ctx.lineTo(width - 12, yMax)
      ctx.stroke()
    }
  }

  const paintInk = (ctx: CanvasRenderingContext2D, strokes: Stroke[], color = '#1a2f1a', width = USER_INK_WIDTH) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokes) {
      if (stroke.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
      ctx.stroke()
    }
  }

  const redraw = (revealY?: number) => {
    const canvas = canvasRef.current
    const template = templateRef.current
    if (!canvas || !template) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h, dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintBackground(ctx, w, h)
    if (revealY != null) {
      paintGhost(ctx, template)
      paintFillReveal(ctx, template, revealY)
    } else if (showGuide) {
      paintGhost(ctx, template)
    }
    paintInk(ctx, strokesRef.current)
    if (currentRef.current.length) paintInk(ctx, [currentRef.current])
  }

  const runDemo = () => {
    const template = templateRef.current
    if (!template) return
    stopDemo()
    setDemoPlaying(true)
    setLastScore(null)

    const duration = 1600
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) * (1 - t)
      redraw(eased * template.height)

      if (t < 1) {
        demoRaf.current = requestAnimationFrame(tick)
      } else {
        setDemoPlaying(false)
        demoRaf.current = null
        redraw(template.height)
        window.setTimeout(() => {
          if (templateRef.current === template) redraw()
        }, 400)
      }
    }
    demoRaf.current = requestAnimationFrame(tick)
  }

  const setup = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const gen = ++setupGen.current
    stopDemo()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(280, parent.clientWidth)
    const h = Math.max(260, Math.min(420, w * 0.85))
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    sizeRef.current = { w, h, dpr }
    strokesRef.current = []
    currentRef.current = []
    setLastScore(null)
    setLoadError(null)
    setReady(false)
    try {
      const template = await buildGlyphTemplate(ghostGlyph, w, h)
      if (gen !== setupGen.current) return
      templateRef.current = template
      setReady(true)
      redraw()
      if (autoDemo) runDemo()
    } catch (err) {
      if (gen !== setupGen.current) return
      setLoadError(err instanceof Error ? err.message : 'Could not load letter template')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        paintBackground(ctx, w, h)
        ctx.fillStyle = 'rgba(26, 47, 26, 0.14)'
        ctx.font = `${Math.floor(h * 0.55)}px "Noto Sans Gurmukhi", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(ghostGlyph, w / 2, h * 0.55)
      }
    }
  }

  useEffect(() => {
    void setup()
    const onResize = () => {
      void setup()
    }
    window.addEventListener('resize', onResize)
    return () => {
      setupGen.current += 1
      window.removeEventListener('resize', onResize)
      stopDemo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostGlyph])

  useEffect(() => {
    if (ready) redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGuide, ready])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (demoPlaying || !ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    drawing.current = true
    currentRef.current = [pos(e)]
    setLastScore(null)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    currentRef.current.push(pos(e))
    redraw()
  }

  const onPointerUp = () => {
    if (!drawing.current) return
    drawing.current = false
    if (currentRef.current.length > 1) {
      strokesRef.current.push(currentRef.current)
    }
    currentRef.current = []
    redraw()
  }

  const clear = () => {
    stopDemo()
    strokesRef.current = []
    currentRef.current = []
    setLastScore(null)
    redraw()
  }

  const check = (): ScoreResult | null => {
    const template = templateRef.current
    if (!template) return null
    const strokes = [...strokesRef.current]
    if (currentRef.current.length > 1) strokes.push([...currentRef.current])
    const result = scoreDrawing(strokes, template, { inkWidth: USER_INK_WIDTH })
    setLastScore(result)
    onScore?.(result)
    return result
  }

  useImperativeHandle(ref, () => ({
    clear,
    replayDemo: runDemo,
    check,
  }))

  return (
    <div className={`drawing-board ${className}`}>
      <div className="drawing-toolbar">
        <button type="button" className="btn btn-ghost" onClick={runDemo} disabled={demoPlaying || !ready}>
          {demoPlaying ? 'Watching…' : 'Replay demo'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={clear} disabled={demoPlaying}>
          Clear
        </button>
        <button type="button" className="btn btn-accent" onClick={() => check()} disabled={demoPlaying || !ready}>
          Check drawing
        </button>
      </div>
      <div className="drawing-frame">
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      {loadError && <p className="hint">Template fallback: {loadError}</p>}
      {lastScore && (
        <p className={`score-line ${lastScore.passed ? 'pass' : 'fail'}`}>
          {lastScore.passed ? (
            <>
              Score {lastScore.percent}% — pass! You can move on.
              <span className="score-detail"> ({lastScore.detail})</span>
            </>
          ) : lastScore.failReason === 'empty' ? (
            <>No pass — {lastScore.detail}.</>
          ) : (
            <>
              Score {lastScore.percent}% — need {DRAW_PASS_PERCENT}%. Try again.
              <span className="score-detail"> ({lastScore.detail})</span>
            </>
          )}
        </p>
      )}
    </div>
  )
})
