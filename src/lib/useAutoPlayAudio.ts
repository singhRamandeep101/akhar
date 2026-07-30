import { useEffect } from 'react'
import { playAudio, stopAudio } from './audio'

/**
 * Play lesson audio once when the stage opens.
 * If the browser blocks autoplay, plays on the next pointer/key gesture instead.
 */
export function useAutoPlayAudio(src: string | undefined) {
  useEffect(() => {
    if (!src) return

    let cancelled = false
    let played = false
    let removeGesture: (() => void) | null = null

    const playOnce = async () => {
      if (cancelled || played) return
      played = true
      removeGesture?.()
      removeGesture = null
      await playAudio(src)
    }

    void playAudio(src).then((result) => {
      if (cancelled) return
      if (result === 'ok') {
        played = true
        return
      }
      // Autoplay policy often returns 'error' until there's a user gesture
      if (result === 'error' && !played && !cancelled) {
        const onGesture = () => {
          void playOnce()
        }
        window.addEventListener('pointerdown', onGesture, { once: true })
        window.addEventListener('keydown', onGesture, { once: true })
        removeGesture = () => {
          window.removeEventListener('pointerdown', onGesture)
          window.removeEventListener('keydown', onGesture)
        }
      }
    })

    return () => {
      cancelled = true
      removeGesture?.()
      stopAudio()
    }
  }, [src])
}
