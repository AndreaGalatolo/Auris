# Auris 🎙️

**Private browser-based transcription powered by OpenAI Whisper.**  
Record system audio or import any audio/video file.  
Everything runs in your browser — zero server, zero upload, zero account.

[![Open Source](https://img.shields.io/badge/open%20source-free%20forever-00d4aa?style=flat-square)](https://github.com/AndreaGalatolo/Auris)
[![Ko-fi](https://img.shields.io/badge/support-ko--fi-ff6b6b?style=flat-square)](https://ko-fi.com/andreagalatolo)

---

## How it works

```
Browser
  ├── Records system audio via screen share  (MediaRecorder)
  ├── Or imports any audio/video file
  └── Transcribes locally with Whisper  (@xenova/transformers — WebAssembly)
        → No audio ever leaves your device
```

> **Note:** Microphone recording is currently disabled due to browser limitations
> when the mic is already in use by another app (Zoom, Meet, etc.).
> Use the **System audio** recorder or import a file instead.

---

## Project structure

```
auris/
├── index.html              # Semantic HTML — zero inline style or script
├── _headers                # Cloudflare Pages: COOP/COEP headers for SharedArrayBuffer
├── _redirects              # Cloudflare Pages: SPA fallback
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
    └── ui.js               # All DOM updates — single source of truth
```

---

## Deploy

### Cloudflare Pages (recommended — free, supports required headers)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create application → **Pages**
2. Connect your GitHub repo
3. Build settings: framework **None**, build command and output directory **empty**
4. Deploy — your app is live at `your-project.pages.dev`

The `_headers` file automatically sets the `Cross-Origin-Opener-Policy` and
`Cross-Origin-Embedder-Policy` headers required for WebAssembly (`SharedArrayBuffer`).

### GitHub Pages

GitHub Pages does not support custom HTTP headers, so `SharedArrayBuffer` (required
by Whisper WASM) will be blocked by the browser. Use Cloudflare Pages instead.

---

## Run locally

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

> ⚠️ Must be served over HTTP/HTTPS — cannot be opened as a local `file://` URL  
> (browser security restrictions block `SharedArrayBuffer` required by WASM).

---

## Whisper models

| Model  | Size     | Speed         | Accuracy            |
|--------|----------|---------------|---------------------|
| Tiny   | ~75 MB   | ⚡ Fast       | Good                |
| Base   | ~145 MB  | Fast          | Better              |
| Small  | ~465 MB  | Moderate      | **Best in browser** |

Models are downloaded once and cached by the browser (`env.useBrowserCache = true`).

---

## Support

If Auris saves you time, consider [buying me a coffee ☕](https://ko-fi.com/andreagalatolo).  
It helps keep the project free and maintained.

---

## License

MIT — free to use, fork, and build upon.
