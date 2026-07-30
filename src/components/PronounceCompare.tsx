import { useEffect, useRef, useState } from 'react'
import { playAudio, stopAudio } from '../lib/audio'

type Props = {
  nativeSrc: string
  label?: string
}

/** Record yourself, then play native vs you side-by-side. */
export function PronounceCompare({ nativeSrc, label = 'Your turn' }: Props) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'ready' | 'unsupported'>('idle')
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      stopAudio()
    }
  }, [])

  const start = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPhase('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        blobUrlRef.current = URL.createObjectURL(blob)
        setPhase('ready')
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 2500)
    } catch {
      setError('Microphone blocked — allow mic access to compare.')
      setPhase('idle')
    }
  }

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const playNative = () => void playAudio(nativeSrc)
  const playYou = () => {
    if (!blobUrlRef.current) return
    stopAudio()
    void new Audio(blobUrlRef.current).play()
  }

  if (phase === 'unsupported') {
    return <p className="hint">Mic compare isn’t supported in this browser.</p>
  }

  return (
    <div className="pronounce-compare">
      <p className="hint">{label} — hear the native clip, then record yourself (~2s).</p>
      <div className="path-actions">
        <button type="button" className="btn btn-ghost" onClick={playNative}>
          Hear native
        </button>
        {phase === 'recording' ? (
          <button type="button" className="btn btn-danger" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-accent" onClick={() => void start()}>
            {phase === 'ready' ? 'Record again' : 'Record me'}
          </button>
        )}
        {phase === 'ready' && (
          <button type="button" className="btn btn-primary" onClick={playYou}>
            Play me
          </button>
        )}
      </div>
      {phase === 'recording' && <p className="hint">Recording…</p>}
      {error && <p className="warn">{error}</p>}
    </div>
  )
}
