let current: HTMLAudioElement | null = null
let playGeneration = 0

export type PlayResult = 'ok' | 'missing' | 'error' | 'stopped'

/** Play a bundled MP3. Never uses speechSynthesis. */
export async function playAudio(src: string): Promise<PlayResult> {
  if (!src) return 'missing'

  stopAudio()
  const gen = ++playGeneration

  const audio = new Audio(src)
  current = audio

  return new Promise((resolve) => {
    const finish = (result: PlayResult) => {
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      if (current === audio) current = null
      resolve(result)
    }

    const onError = () => {
      // Cleared src / superseded play looks like an error — don't call it "missing"
      finish(gen !== playGeneration ? 'stopped' : 'missing')
    }
    const onEnded = () => {
      finish(gen !== playGeneration ? 'stopped' : 'ok')
    }

    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)

    void audio.play().then(
      () => {
        /* playing — resolve on ended */
      },
      () => {
        finish(gen !== playGeneration ? 'stopped' : 'error')
      },
    )
  })
}

export function stopAudio() {
  playGeneration += 1
  if (current) {
    const audio = current
    current = null
    audio.pause()
    audio.removeAttribute('src')
    try {
      audio.load()
    } catch {
      /* ignore */
    }
  }
}

export function playLetterAudio(audio: string) {
  return playAudio(audio)
}

export function playWordAudio(audio: string) {
  return playAudio(audio)
}

export function playMatraAudio(audio: string) {
  return playAudio(audio)
}
