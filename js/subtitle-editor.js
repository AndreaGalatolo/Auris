/**
 * Auris — subtitle-editor.js
 * ==========================
 * Subtitle editing interface.
 * Allows users to edit timestamps and text of transcribed segments.
 */

"use strict";

let editedSegments = [];
let isEditingMode = false;

export function isEditing() {
  return isEditingMode;
}

export function getEditedSegments() {
  if (!isEditingMode) return null;
  return editedSegments.map(seg => ({
    ...seg,
  }));
}

export function renderEditor(segments) {
  const body = document.getElementById("transcriptBody");
  editedSegments = JSON.parse(JSON.stringify(segments));
  isEditingMode = true;

  body.innerHTML = editedSegments
    .map((seg, idx) => {
      const start = seg.timestamp?.[0] ?? 0;
      const end = seg.timestamp?.[1] ?? (start + 2);
      const startStr = formatTime(start);
      const endStr = formatTime(end);

      return `
        <div class="segment segment--editable" data-index="${idx}">
          <div class="segment__time-inputs">
            <input class="segment__time-input segment__time-start"
                   type="text"
                   value="${startStr}"
                   placeholder="00:00"
                   aria-label="Start time">
            <span class="segment__time-separator">→</span>
            <input class="segment__time-input segment__time-end"
                   type="text"
                   value="${endStr}"
                   placeholder="00:00"
                   aria-label="End time">
          </div>
          <textarea class="segment__text-input"
                    aria-label="Segment text">${seg.text.trim()}</textarea>
        </div>
      `;
    })
    .join("");

  attachEditorListeners();
  toggleEditorButtons();
}

export function exitEditor() {
  isEditingMode = false;
  editedSegments = [];
  toggleEditorButtons();
}

function attachEditorListeners() {
  const segments = document.querySelectorAll(".segment--editable");

  segments.forEach((seg, idx) => {
    const startInput = seg.querySelector(".segment__time-start");
    const endInput   = seg.querySelector(".segment__time-end");
    const textInput  = seg.querySelector(".segment__text-input");

    startInput?.addEventListener("change", () => {
      const seconds = parseTimeInput(startInput.value);
      if (seconds !== null) {
        editedSegments[idx].timestamp[0] = seconds;
        startInput.value = formatTime(seconds);
      }
    });

    endInput?.addEventListener("change", () => {
      const seconds = parseTimeInput(endInput.value);
      if (seconds !== null) {
        editedSegments[idx].timestamp[1] = seconds;
        endInput.value = formatTime(seconds);
      }
    });

    textInput?.addEventListener("change", () => {
      editedSegments[idx].text = textInput.value;
    });

    startInput?.addEventListener("click", () => {
      seekAudio(editedSegments[idx].timestamp?.[0] ?? 0);
    });
  });
}

function toggleEditorButtons() {
  const actions = document.querySelector(".transcript__actions");
  if (!actions) return;

  const saveBtn   = actions.querySelector("[data-action='save-changes']");
  const cancelBtn = actions.querySelector("[data-action='cancel-edit']");
  const editBtn   = actions.querySelector("[data-action='edit']");
  const copyBtn   = actions.querySelector("[data-action='copy']");
  const dlTxtBtn  = actions.querySelector("[data-action='download-txt']");
  const dlSrtBtn  = actions.querySelector("[data-action='download-srt']");

  if (isEditingMode) {
    saveBtn?.classList.remove("hidden");
    cancelBtn?.classList.remove("hidden");
    editBtn?.classList.add("hidden");
    copyBtn?.classList.add("hidden");
    dlTxtBtn?.classList.add("hidden");
    dlSrtBtn?.classList.add("hidden");
  } else {
    saveBtn?.classList.add("hidden");
    cancelBtn?.classList.add("hidden");
    editBtn?.classList.remove("hidden");
    copyBtn?.classList.remove("hidden");
    dlTxtBtn?.classList.remove("hidden");
    dlSrtBtn?.classList.remove("hidden");
  }
}

/**
 * Parse a time string in MM:SS format to seconds.
 * Accepts: "01:30" → 90, "0:05" → 5
 * Returns null if the format is invalid.
 * @param {string} str
 * @returns {number|null}
 */
function parseTimeInput(str) {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Only support MM:SS — matches what formatTime produces
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);

  if (mins < 0 || secs < 0 || secs > 59) return null;

  return mins * 60 + secs;
}

/**
 * Format seconds to MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Seek the active audio player to a given time.
 * Uses importPlayer only — recPlayer has been removed from the UI.
 * @param {number} timeSeconds
 */
function seekAudio(timeSeconds) {
  const player = document.getElementById("importPlayer");
  if (player?.src) {
    player.currentTime = timeSeconds;
  }
}