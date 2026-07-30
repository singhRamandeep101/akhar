import { useState } from 'react'
import { playAudio, type PlayResult } from '../lib/audio'

type Props = {
  src: string
  label?: string
  className?: string
}

export function PlaySoundButton({ src, label = 'Play sound', className = 'btn btn-accent' }: Props) {
  const [status, setStatus] = useState<'idle' | 'playing' | PlayResult>('idle')

  const onPlay = async () => {
    setStatus('playing')
    const result = await playAudio(src)
    setStatus(result === 'ok' || result === 'stopped' ? 'idle' : result)
  }

  return (
    <div className="play-sound">
      <button type="button" className={className} onClick={() => void onPlay()} disabled={status === 'playing'}>
        {status === 'playing' ? 'Playing…' : label}
      </button>
      {(status === 'missing' || status === 'error') && (
        <p className="audio-missing" role="status">
          Couldn’t play this clip. Check your volume, then tap again.
        </p>
      )}
    </div>
  )
}
