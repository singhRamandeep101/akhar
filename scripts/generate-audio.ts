/**
 * One-time generator: Azure Punjabi neural TTS → public/audio/*.mp3
 *
 * Setup:
 *   1. Create a free Azure Speech resource
 *   2. Copy .env.example → .env and fill AZURE_SPEECH_KEY + AZURE_SPEECH_REGION
 *   3. npm run generate-audio
 *
 * Safe to re-run: skips files that already exist. Retries on 429 throttling.
 */
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { letters } from '../src/data/letters.ts'
import { matras } from '../src/data/matras.ts'
import { words } from '../src/data/words.ts'

config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')

const KEY = process.env.AZURE_SPEECH_KEY
const REGION = process.env.AZURE_SPEECH_REGION || 'eastus'
const VOICE = process.env.AZURE_SPEECH_VOICE || 'pa-IN-VaaniNeural'
/** Pause between successful requests (Free F0 is strict). */
const GAP_MS = Number(process.env.AZURE_TTS_GAP_MS || 2000)
const MAX_RETRIES = 8

type Clip = { id: string; ttsText: string; audio: string }

function clips(): Clip[] {
  return [
    ...letters.map((l) => ({ id: l.id, ttsText: l.ttsText, audio: l.audio })),
    ...matras.map((m) => ({ id: m.id, ttsText: m.ttsText, audio: m.audio })),
    ...words.map((w) => ({ id: w.id, ttsText: w.ttsText, audio: w.audio })),
  ]
}

function escapeXml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fileExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function synthesizeOnce(text: string): Promise<{ ok: true; buf: Buffer } | { ok: false; status: number; body: string }> {
  const ssml = `<speak version='1.0' xml:lang='pa-IN'><voice name='${VOICE}'>${escapeXml(text)}</voice></speak>`
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY!,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'akhar-punjabi-learn',
    },
    body: ssml,
  })
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() }
  }
  return { ok: true, buf: Buffer.from(await res.arrayBuffer()) }
}

async function synthesize(text: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await synthesizeOnce(text)
    if (result.ok) return result.buf

    const retryable = result.status === 429 || result.status >= 500
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Azure TTS ${result.status}: ${result.body}`)
    }

    // Free tier: wait longer on each throttle (15s, 30s, 45s…)
    const waitMs = Math.min(120_000, 15_000 * attempt)
    process.stdout.write(`throttled, wait ${Math.round(waitMs / 1000)}s (try ${attempt}/${MAX_RETRIES})… `)
    await sleep(waitMs)
  }
  throw new Error('Unreachable')
}

async function main() {
  if (!KEY) {
    console.error('Missing AZURE_SPEECH_KEY. Copy .env.example to .env and add your Azure Speech key.')
    process.exit(1)
  }

  const all = clips()
  console.log(`Generating up to ${all.length} clips with ${VOICE} in ${REGION} (gap ${GAP_MS}ms, skips existing)…`)

  let made = 0
  let skipped = 0

  for (const clip of all) {
    const rel = clip.audio.replace(/^\//, '')
    const outPath = path.join(publicDir, rel)
    await mkdir(path.dirname(outPath), { recursive: true })

    if (await fileExists(outPath)) {
      console.log(`  ${rel} ← ${clip.ttsText} … skip (exists)`)
      skipped += 1
      continue
    }

    process.stdout.write(`  ${rel} ← ${clip.ttsText} … `)
    try {
      const buf = await synthesize(clip.ttsText)
      await writeFile(outPath, buf)
      console.log(`ok (${buf.length} bytes)`)
      made += 1
    } catch (err) {
      console.log('FAIL')
      console.error(err)
      console.error('\nStopped early. Re-run `npm run generate-audio` later — existing files are kept.')
      process.exit(1)
    }
    await sleep(GAP_MS)
  }

  console.log(`Done. Created ${made}, skipped ${skipped}. MP3s are in public/audio/`)
}

main()
