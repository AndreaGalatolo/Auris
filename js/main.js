/**
 * Auris — main.js
 * ===============
 * Application entry point.
 * Imports all modules and wires up event listeners.
 * No business logic lives here — only event → module calls.
 */

"use strict";

import { initWaveform, toggleRecord, setAudioBlob, getAudioBlob } from "./audio.js";
import { loadModel, transcribe }                                    from "./transcriber.js";
import { copyToClipboard, downloadTxt, downloadSrt }               from "./export.js";
import { setActiveSourceTab, setFileLoaded, setDropzoneDragOver, setAudioReadyFlag } from "./ui.js";

// ── App state ─────────────────────────────────────────────

let currentSource = "mic";  // 'mic' | 'system' | 'both'

// ── Init ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initWaveform();
  bindEvents();
});

// ── Event binding ─────────────────────────────────────────

function bindEvents() {

  // Model load
  document.getElementById("loadBtn").addEventListener("click", () => {
    const modelId = document.querySelector("input[name='model']:checked").value;
    loadModel(modelId);
  });

  // Source tabs
  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      currentSource = tab.dataset.source;
      setActiveSourceTab(tab);
    });
  });

  // Record toggle
  document.getElementById("btnRecord").addEventListener("click", () => {
    toggleRecord(currentSource);
  });

  // "Use this recording" button — audio is already set, just confirm
  document.getElementById("btnUseRecording").addEventListener("click", () => {
    // Audio blob was set inside audio.js on recorder stop.
    // This button is a UX confirmation; state is already correct.
  });

  // File import — click
  document.getElementById("dropzone").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });

  document.getElementById("fileInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileLoad(file);
  });

  // File import — drag & drop
  const dropzone = document.getElementById("dropzone");

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    setDropzoneDragOver(true);
  });

  dropzone.addEventListener("dragleave", () => {
    setDropzoneDragOver(false);
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    setDropzoneDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileLoad(file);
  });

  // Transcribe
  document.getElementById("btnTranscribe").addEventListener("click", () => {
    const blob = getAudioBlob();
    if (!blob) return;

    const language   = document.getElementById("language").value || null;
    const outputMode = document.getElementById("outputMode").value;

    transcribe(blob, { language, outputMode });
  });

  // Export actions
  document.querySelector("[data-action='copy']").addEventListener("click",        copyToClipboard);
  document.querySelector("[data-action='download-txt']").addEventListener("click", downloadTxt);
  document.querySelector("[data-action='download-srt']").addEventListener("click", downloadSrt);
}

// ── File handling ─────────────────────────────────────────

function handleFileLoad(file) {
  const url = URL.createObjectURL(file);
  setAudioBlob(file);
  setAudioReadyFlag(true);
  setFileLoaded(file.name, url);
}