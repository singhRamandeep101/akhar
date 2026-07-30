# Akhar — Punjabi Learning Path

Learn Gurmukhi (Punjabi script): see → hear → trace each letter, pass a tough quiz to unlock the next unit, then matras and words. Progress stays in the browser (export/import on the home screen).

## Try it live

**https://singhramandeep101.github.io/akhar/**

(After the first deploy finishes — usually 1–2 minutes.)

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Audio

Bundled MP3s under `public/audio/` (not browser TTS). To regenerate with Azure:

1. Copy `.env.example` → `.env` with `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
2. `npm run generate-audio`

## Curriculum

1. Vowel carriers → Sassa/Haha → consonant rows  
2. Matras on ਕ  
3. Word-reading units  

Pass unit quizzes at **90%** to unlock the next step.
