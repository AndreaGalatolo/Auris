# Auris 🎙️

**Private browser-based transcription powered by OpenAI Whisper.**  
Record system audio or import any audio/video file.  
Everything runs in your browser — zero server, zero upload, zero account.

[![Open Source](https://img.shields.io/badge/open%20source-free%20forever-00d4aa?style=flat-square)](https://github.com/AndreaGalatolo/Auris)
[![Ko-fi](https://img.shields.io/badge/support-ko--fi-ff6b6b?style=flat-square)](https://ko-fi.com/andreagalatolo)
[![PWA](https://img.shields.io/badge/PWA-installable-00d4aa?style=flat-square)](#install-as-app)

---

## Why Auris

- **100% private** — your audio never leaves your device, ever
- **No account** — open the URL and start transcribing
- **No server costs** — Whisper runs in WebAssembly inside your browser
- **Works offline** — after the first load, no internet connection required
- **Installable** — add it to your desktop or home screen like a native app
- **Open source** — MIT licensed, free forever

---

## Features

**Transcription**
- Three Whisper model sizes: Tiny (75MB), Base (145MB), Small (465MB)
- Auto language detection or manual selection (10 languages)
- Timestamped segments or plain text output
- Real-time chunk progress indicator during transcription
- Optimised chunking (20s chunks, 4s stride) for best accuracy

**Input**
- Record system audio via screen share (captures any app: meetings, videos, podcasts)
- Import any audio or video file — audio is extracted automatically from video
- Supported formats: mp4 · mov · mkv · avi · mp3 · wav · m4a · webm · ogg · flac

**Transcript tools**
- Edit segments — modify text and timestamps inline
- Live search — filter and highlight matching segments
- Export as TXT or SRT
- Copy to clipboard

**PWA**
- Installable on desktop (Windows, Mac, Linux) and mobile (Android, iOS)
- Full offline support after first load — models are cached in the browser

---

## How it works

```
Browser
  ├── Records system audio via screen share  (MediaRecorder)
  ├── Or imports any audio/video file
  └── Transcribes locally with Whisper  (@xenova/transformers — WebAssembly)
        → No audio ever leaves your device
```

> **Note on microphone recording:** currently disabled due to a browser limitation —
> when a video call (Zoom, Meet, Teams) is active, Chrome grants the mic exclusively
> to one consumer and the recorder captures silence.
> Use **System audio** to capture meetings, or import a file.

---

## Install as app

Auris is a Progressive Web App — you can install it like a native app.

**Desktop (Chrome / Edge)**
1. Open [andreagalatolo.github.io/Auris](https://andreagalatolo.github.io/Auris/)
2. Click the install icon in the address bar (monitor with arrow)
3. Click **Install**

**Android**
1. Open the URL in Chrome
2. Tap the menu (⋮) → **Add to Home screen**
3. Tap **Add**

**iOS (Safari)**
1. Open the URL in Safari
2. Tap the share icon → **Add to Home Screen**
3. Tap **Add**

After installation, Auris opens in standalone mode (no browser UI) and works fully offline.

---

## Project structure

```
auris/
├── index.html              # Semantic HTML — zero inline style or script
├── manifest.json           # PWA manifest — icons, theme, start URL
├── sw.js                   # Service Worker — offline cache strategy
├── _headers                # Cloudflare Pages: COOP/COEP headers for SharedArrayBuffer
├── _redirects              # Cloudflare Pages: SPA fallback
├── icons/
│   ├── icon-192.png        # PWA icon
│   └── icon-512.png        # PWA icon (large)
├── css/
│   ├── reset.css           # Minimal cross-browser reset
│   ├── tokens.css          # CSS custom properties (colors, spacing, fonts)
│   ├── layout.css          # Page structure: header, hero, grid, footer
│   ├── components.css      # All UI components: buttons, cards, waveform…
│   └── animations.css      # @keyframes and staggered entry animations
└── js/
    ├── main.js             # Entry point — event wiring only, no logic
    ├── audio.js            # Recording, Web Audio API, waveform canvas
    ├── transcriber.js      # Whisper model loading + transcription
    ├── export.js           # TXT / SRT file generation and download
    ├── ui.js               # All DOM updates — single source of truth
    ├── subtitle-editor.js  # Segment editing — timestamps and text
    └── transcript-search.js  # Live search with highlight and filtering
```

---

## Deploy

### GitHub Pages

GitHub Pages does not support custom HTTP headers, so `SharedArrayBuffer` will be
blocked by the browser and Whisper WASM will not run. Use Cloudflare Pages instead,
or add [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) as a workaround
(not recommended — Safari incompatible).

---

## Run locally

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

> ⚠️ Must be served over HTTP/HTTPS — cannot be opened as a local `file://` URL.  
> Browser security restrictions block `SharedArrayBuffer` on file:// origins.

---

## Whisper models

| Model  | Size     | Speed         | Accuracy            |
|--------|----------|---------------|---------------------|
| Tiny   | ~75 MB   | ⚡ Fast       | Good                |
| Base   | ~145 MB  | Fast          | Better              |
| Small  | ~465 MB  | Moderate      | **Best in browser** |

Models are downloaded once from [jsdelivr CDN](https://cdn.jsdelivr.net) and cached
by the browser (`env.useBrowserCache = true`). After the first load, transcription
works fully offline.

Larger models (Medium ~1.5GB, Large ~3GB) exceed practical RAM limits in the browser.
They will be available in the upcoming desktop version with GPU acceleration.

---

## Coming soon — Auris Desktop

A native desktop app is in development, built with **Tauri** (Windows, Mac, Linux).

The desktop version will add:
- **Larger Whisper models** (Medium, Large-v3) with no RAM constraints
- **GPU acceleration** via `faster-whisper` — 10–20x faster than browser WASM
- **Full microphone support** — capture mic and system audio simultaneously, like OBS
- **Speaker diarization** — identify and label individual speakers
- No browser limitations, no screen-share popup

The web version will remain free and open source alongside the desktop app.

---

## Contributing

Contributions are welcome. The project uses vanilla HTML/CSS/JS with no build step —
you can start editing immediately.

**Setup**
```bash
git clone https://github.com/AndreaGalatolo/Auris
cd Auris
python -m http.server 8080
# Open http://localhost:8080
```

**Branch naming**
```
feature/<name>   # new features
fix/<name>       # bug fixes
perf/<name>      # performance improvements
```

**Guidelines**
- Keep JS in ES Modules — no bundler, no transpilation
- All DOM updates go through `ui.js` — other modules never touch the DOM directly
- CSS changes belong in the appropriate file (`tokens.css` for values, `components.css` for UI, etc.)
- Open a PR against `develop`, not `main`

---

## Support

If Auris saves you time, consider [buying me a coffee ☕](https://ko-fi.com/andreagalatolo).  
It helps keep the project free and maintained.

---

## License

MIT — free to use, fork, and build upon.