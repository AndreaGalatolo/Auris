/**
 * Auris — transcriber.js
 * ======================
 * Wraps @xenova/transformers automatic-speech-recognition pipeline.
 * Handles model loading, audio decoding, and transcription.
 *
 * All processing happens in the browser via WebAssembly.
 * No audio data is ever sent to a server.
 */

"use strict";

import {
  setModelLoading,
  setModelProgress,
  setModelReady,
  setModelError,
  setModelReadyFlag,
  showProcessing,
  updateProcessingDetail,
  hideProcessing,
  renderTranscript,
  setTranscriptError,
  setStatus,
} from "./ui.js";

// ── Module state ──────────────────────────────────────────

let pipeline     = null;
let pipelineFn   = null;
let lastSegments = [];
let lastLanguage = "";

// ── Public API ────────────────────────────────────────────

export function getSegments() { return lastSegments; }
export function getLanguage()  { return lastLanguage; }

/**
 * Load the selected Whisper model.
 * @param {string} modelId  e.g. "Xenova/whisper-tiny"
 */
export async function loadModel(modelId) {
  setModelLoading();

  try {
    // Dynamic import of transformers — avoids blocking initial page load
    const { pipeline: createPipeline, env } = await import(
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
    );

    env.allowLocalModels = false;
    env.useBrowserCache  = true;

    pipelineFn = createPipeline;

    pipeline = await createPipeline(
      "automatic-speech-recognition",
      modelId,
      {
        chunk_length_s:  30,
        stride_length_s: 5,
        progress_callback: (progress) => {
          if (progress.status === "downloading") {
            const pct  = progress.total
              ? Math.round((progress.loaded / progress.total) * 100)
              : 0;
            const file = progress.file ?? "model weights";
            setModelProgress(`Downloading ${file}…`, pct);
          }
        },
      }
    );

    const shortName = modelId.split("/")[1];
    setModelReady(shortName);
    setModelReadyFlag(true);

  } catch (err) {
    setModelError(err.message);
    throw err;
  }
}

/**
 * Transcribe an audio Blob.
 * @param {Blob}   audioBlob
 * @param {Object} options
 * @param {string} [options.language]      ISO 639-1 code, null = auto-detect
 * @param {'segments'|'plain'} [options.outputMode]
 */
export async function transcribe(audioBlob, { language = null, outputMode = "segments" } = {}) {
  if (!pipeline) throw new Error("Model not loaded");

  showProcessing();

  try {
    const audioData = await decodeAudioBlob(audioBlob);

    let chunkIndex = 0;
    const result = await pipeline(audioData, {
      language:          language || null,
      task:              "transcribe",
      return_timestamps: true,
      chunk_length_s:    30,
      stride_length_s:   5,
      callback_function: () => {
        chunkIndex++;
        updateProcessingDetail(`Processing chunk ${chunkIndex}…`);
      },
    });

    lastSegments = result.chunks ?? [];
    lastLanguage = result.language ?? language ?? "";

    hideProcessing();
    renderTranscript(lastSegments, lastLanguage, outputMode);
    setStatus("green", `Done — ${lastSegments.length} segment${lastSegments.length !== 1 ? "s" : ""}`);

  } catch (err) {
    hideProcessing();
    setTranscriptError(err.message);
    setStatus("red", "Transcription failed: " + err.message);
    throw err;
  }
}

// ── Audio decoding ────────────────────────────────────────

/**
 * Decode an audio Blob to a mono Float32Array at 16 kHz.
 * Whisper requires 16 kHz mono PCM as input.
 * @param {Blob} blob
 * @returns {Promise<Float32Array>}
 */
async function decodeAudioBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx    = new AudioContext({ sampleRate: 16_000 });

  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const mono    = decoded.numberOfChannels > 1
    ? mixDownToMono(decoded)
    : decoded.getChannelData(0);

  await audioCtx.close();
  return mono;
}

/**
 * Average all channels into a single mono Float32Array.
 * @param {AudioBuffer} audioBuffer
 * @returns {Float32Array}
 */
function mixDownToMono(audioBuffer) {
  const { length, numberOfChannels } = audioBuffer;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i];
    }
  }

  for (let i = 0; i < length; i++) {
    mono[i] /= numberOfChannels;
  }

  return mono;
}