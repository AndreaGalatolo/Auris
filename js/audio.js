/**
 * Auris — audio.js
 * ================
 * Manages all audio capture:
 *   - Microphone via getUserMedia
 *   - System audio via getDisplayMedia
 *   - Mixed mic + system via Web Audio API
 *   - MediaRecorder → Blob
 *   - Waveform canvas animation
 */

"use strict";

import {
  setRecordingActive,
  setRecordingDone,
  updateRecTimer,
  setStatus,
  setAudioReadyFlag,
} from "./ui.js";

// ── State ─────────────────────────────────────────────────

const state = {
  mediaRecorder:  null,
  chunks:         [],
  streams:        [],   // All MediaStream instances to clean up
  audioCtx:       null,
  analyser:       null,
  isRecording:    false,
  seconds:        0,
  timerInterval:  null,
  animFrame:      null,
  idleT:          0,
  audioBlob:      null,
};

// ── Public API ────────────────────────────────────────────

/** @returns {Blob|null} The last recorded audio blob */
export function getAudioBlob() {
  return state.audioBlob;
}

/** @param {Blob} blob — set externally from a file import */
export function setAudioBlob(blob) {
  state.audioBlob = blob;
}

/** @returns {boolean} */
export function isRecording() {
  return state.isRecording;
}

/**
 * Toggle recording on/off.
 * @param {'mic'|'system'|'both'} source
 */
export async function toggleRecord(source) {
  if (state.isRecording) {
    stopRecord();
  } else {
    await startRecord(source);
  }
}

// ── Recording ─────────────────────────────────────────────

async function startRecord(source) {
  let mixStream;

  try {
    mixStream = await buildAudioStream(source);
  } catch (err) {
    setStatus("red", "Access denied: " + err.message);
    return;
  }

  // Waveform analyser on the mix
  state.audioCtx = state.audioCtx ?? new AudioContext();
  state.analyser = state.audioCtx.createAnalyser();
  state.analyser.fftSize = 2048;
  state.audioCtx.createMediaStreamSource(mixStream).connect(state.analyser);

  // MediaRecorder
  const mime = pickMimeType();
  state.chunks        = [];
  state.mediaRecorder = new MediaRecorder(mixStream, { mimeType: mime });

  state.mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) state.chunks.push(e.data);
  };

  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.chunks, { type: mime });
    state.audioBlob = blob;
    const url = URL.createObjectURL(blob);
    setRecordingDone(url);
    setAudioReadyFlag(true);
    drawIdle();
  };

  state.mediaRecorder.start(100);
  state.isRecording = true;

  // Timer
  state.seconds = 0;
  state.timerInterval = setInterval(() => {
    state.seconds++;
    updateRecTimer(state.seconds);
  }, 1000);

  setRecordingActive();
  drawLive();
}

function stopRecord() {
  state.mediaRecorder?.stop();
  stopAllStreams();
  clearInterval(state.timerInterval);
  cancelAnimationFrame(state.animFrame);
  state.isRecording = false;
}

async function buildAudioStream(source) {
  const audioCtx = new AudioContext();
  state.audioCtx = audioCtx;
  const dest = audioCtx.createMediaStreamDestination();

  if (source === "mic" || source === "both") {
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    state.streams.push(micStream);
    audioCtx.createMediaStreamSource(micStream).connect(dest);
  }

  if (source === "system" || source === "both") {
    try {
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      // Drop the video track — we only want audio
      sysStream.getVideoTracks().forEach(t => t.stop());
      if (sysStream.getAudioTracks().length === 0) {
        throw new Error("No system audio captured. Enable 'Share audio' in the browser dialog.");
      }
      state.streams.push(sysStream);
      audioCtx.createMediaStreamSource(sysStream).connect(dest);
    } catch (err) {
      if (source === "system") throw err;
      // In 'both' mode, fall back to mic-only silently
      console.warn("System audio unavailable, using mic only:", err.message);
    }
  }

  return dest.stream;
}

function stopAllStreams() {
  state.streams.forEach(s => s.getTracks().forEach(t => t.stop()));
  state.streams = [];
}

// ── Waveform ──────────────────────────────────────────────

const CANVAS_ID = "waveform";

function getCanvas() {
  return document.getElementById(CANVAS_ID);
}

function scaleCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, W: canvas.offsetWidth, H: canvas.offsetHeight };
}

function drawLive() {
  const canvas = getCanvas();
  const { ctx, W, H } = scaleCanvas(canvas);
  const buf = new Uint8Array(state.analyser.frequencyBinCount);

  const frame = () => {
    state.analyser.getByteTimeDomainData(buf);
    ctx.clearRect(0, 0, W, H);

    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0,   "#00d4aa");
    gradient.addColorStop(0.5, "#00b8d4");
    gradient.addColorStop(1,   "#0099ff");

    ctx.strokeStyle = gradient;
    ctx.lineWidth   = 1.8;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = "rgba(0, 212, 170, 0.6)";
    ctx.beginPath();

    const sliceW = W / buf.length;
    for (let i = 0; i < buf.length; i++) {
      const y = (buf[i] / 128) * (H / 2);
      i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * sliceW, y);
    }
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    state.animFrame = requestAnimationFrame(frame);
  };

  cancelAnimationFrame(state.animFrame);
  frame();
}

function drawIdle() {
  cancelAnimationFrame(state.animFrame);
  const canvas = getCanvas();
  const { ctx, W, H } = scaleCanvas(canvas);

  const tick = () => {
    state.idleT += 0.018;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0, 212, 170, 0.15)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = H / 2 + Math.sin(x * 0.04 + state.idleT) * 4;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    state.animFrame = requestAnimationFrame(tick);
  };
  tick();
}

/** Call on page load to start the idle animation */
export function initWaveform() {
  drawIdle();
}

// ── Helpers ───────────────────────────────────────────────

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
}