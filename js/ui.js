/**
 * Auris — ui.js
 * =============
 * All DOM manipulation lives here.
 * Other modules call these functions; they never touch the DOM directly.
 */

"use strict";

// ── Status bar ────────────────────────────────────────────

/**
 * @param {'idle'|'green'|'red'|'blue'} state
 * @param {string} message
 */
export function setStatus(state, message) {
  const dot  = document.getElementById("statusDot");
  const text = document.getElementById("statusText");

  dot.className = "status-bar__dot";
  if (state !== "idle") dot.classList.add(`status-bar__dot--${state}`);

  text.textContent = message;
}

// ── Model loading UI ──────────────────────────────────────

export function setModelLoading() {
  const btn = document.getElementById("loadBtn");
  btn.disabled    = true;
  btn.textContent = "Loading…";
  document.getElementById("progress").classList.add("progress--visible");
  setStatus("blue", "Downloading model — cached after first load…");
}

/** @param {number} pct 0–100 */
export function setModelProgress(label, pct) {
  document.getElementById("progressLabel").textContent = label;
  document.getElementById("progressPct").textContent   = pct + "%";
  document.getElementById("progressFill").style.width  = pct + "%";
}

/** @param {string} modelName */
export function setModelReady(modelName) {
  document.getElementById("progress").classList.remove("progress--visible");
  document.getElementById("modelReady").classList.add("model-ready--visible");
  document.getElementById("modelReadyLabel").textContent = `${modelName} ready`;

  const btn      = document.getElementById("loadBtn");
  btn.disabled   = true;
  btn.textContent = "✓ Model loaded";

  document.getElementById("btnRecord").disabled = false;
  updateTranscribeBtn();
}

export function setModelError(message) {
  const btn    = document.getElementById("loadBtn");
  btn.disabled = false;
  btn.textContent = "Retry";
  setStatus("red", "Failed to load model: " + message);
}

// ── Recording UI ──────────────────────────────────────────

export function setRecordingActive() {
  const btn = document.getElementById("btnRecord");
  btn.className = "btn btn--danger";
  btn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
      <rect x="0.5" y="0.5" width="10" height="10" rx="2"/>
    </svg>
    Stop
  `;
  document.getElementById("btnUseRecording").disabled = true;
  document.getElementById("recTimer").classList.add("rec-timer--active");
  setStatus("red", "Recording…");
}

export function setRecordingDone(objectUrl) {
  const btn = document.getElementById("btnRecord");
  btn.className = "btn btn--primary";
  btn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="6" cy="6" r="5"/>
    </svg>
    Record
  `;

  document.getElementById("recTimer").classList.remove("rec-timer--active");
  document.getElementById("btnUseRecording").disabled = false;

  const player = document.getElementById("recPlayer");
  player.src = objectUrl;
  player.classList.add("audio-player--visible");

  setStatus("green", "Recording done — press Transcribe");
  updateTranscribeBtn();
}

/** @param {number} totalSeconds */
export function updateRecTimer(totalSeconds) {
  const m  = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s  = (totalSeconds % 60).toString().padStart(2, "0");
  document.getElementById("recTimer").textContent = `${m}:${s}`;
}

// ── File import UI ────────────────────────────────────────

export function setFileLoaded(filename, objectUrl) {
  const info = document.getElementById("fileInfo");
  info.textContent = "✓ " + filename;
  info.classList.add("file-info--visible");

  const player = document.getElementById("importPlayer");
  player.src = objectUrl;
  player.classList.add("audio-player--visible");

  setStatus("green", `File loaded: ${filename} — press Transcribe`);
  updateTranscribeBtn();
}

// ── Transcribe button ─────────────────────────────────────

/**
 * Enable/disable the transcribe button based on global state.
 * Called whenever model or audio state changes.
 */
export function updateTranscribeBtn() {
  const modelReady = document.body.dataset.modelReady === "true";
  const audioReady = document.body.dataset.audioReady === "true";
  document.getElementById("btnTranscribe").disabled = !(modelReady && audioReady);
}

export function setModelReadyFlag(val) {
  document.body.dataset.modelReady = val;
  updateTranscribeBtn();
}

export function setAudioReadyFlag(val) {
  document.body.dataset.audioReady = val;
  updateTranscribeBtn();
}

// ── Processing ────────────────────────────────────────────

export function showProcessing(detail = "Running in your browser — no data sent anywhere") {
  document.getElementById("processing").classList.add("processing--visible");
  document.getElementById("processingDetail").textContent = detail;
  document.getElementById("btnTranscribe").disabled = true;
  document.getElementById("transcriptBody").innerHTML =
    '<span class="transcript__empty">Transcribing…</span>';
  setStatus("blue", "Transcribing — this may take a moment…");
}

export function updateProcessingDetail(detail) {
  document.getElementById("processingDetail").textContent = detail;
}

export function hideProcessing() {
  document.getElementById("processing").classList.remove("processing--visible");
  document.getElementById("btnTranscribe").disabled = false;
}

// ── Transcript rendering ──────────────────────────────────

/**
 * @param {Array<{text: string, timestamp?: [number, number]}>} segments
 * @param {string} language
 * @param {'segments'|'plain'} mode
 */
export function renderTranscript(segments, language, mode) {
  const body  = document.getElementById("transcriptBody");
  const badge = document.getElementById("langBadge");

  if (language) {
    badge.textContent = language.toUpperCase();
    badge.classList.add("transcript__lang-badge--visible");
  }

  if (!segments || segments.length === 0) {
    body.innerHTML = '<span class="transcript__empty">No speech detected.</span>';
    return;
  }

  if (mode === "plain") {
    body.textContent = segments.map(s => s.text.trim()).join(" ");
    return;
  }

  body.innerHTML = segments
    .map(seg => {
      const start = seg.timestamp?.[0] ?? 0;
      return `
        <div class="segment">
          <span class="segment__time">${formatTime(start)}</span>
          <span class="segment__text">${escapeHtml(seg.text.trim())}</span>
        </div>`;
    })
    .join("");

  ensureEditButton();
  document.dispatchEvent(new CustomEvent("auris:transcript-ready"));
}

export function ensureEditButton() {
  const actions = document.querySelector(".transcript__actions");
  if (!actions) return;

  if (actions.querySelector("[data-action='edit']")) return;

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn--action";
  editBtn.setAttribute("data-action", "edit");
  editBtn.textContent = "✎ Edit";
  actions.insertBefore(editBtn, actions.firstChild);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn--action hidden";
  saveBtn.setAttribute("data-action", "save-changes");
  saveBtn.textContent = "✓ Save changes";
  actions.insertBefore(saveBtn, actions.firstChild);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--action hidden";
  cancelBtn.setAttribute("data-action", "cancel-edit");
  cancelBtn.textContent = "Cancel";
  actions.insertBefore(cancelBtn, actions.firstChild);
}

export function setTranscriptError(message) {
  document.getElementById("transcriptBody").innerHTML =
    `<span style="color:var(--color-danger);font-family:var(--font-mono);font-size:.82rem">
      Error: ${escapeHtml(message)}
    </span>`;
}

// ── Source tab ────────────────────────────────────────────

export function setActiveSourceTab(activeEl) {
  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.classList.toggle("source-tab--active", tab === activeEl);
  });
}

// ── Dropzone ──────────────────────────────────────────────

export function setDropzoneDragOver(active) {
  document.getElementById("dropzone").classList.toggle("dropzone--dragover", active);
}

// ── Helpers ───────────────────────────────────────────────

function formatTime(seconds) {
  const m  = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s  = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}