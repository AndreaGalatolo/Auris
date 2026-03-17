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
    const endInput = seg.querySelector(".segment__time-end");
    const textInput = seg.querySelector(".segment__text-input");

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

  const saveBtn = actions.querySelector("[data-action='save-changes']");
  const cancelBtn = actions.querySelector("[data-action='cancel-edit']");
  const editBtn = actions.querySelector("[data-action='edit']");
  const copyBtn = actions.querySelector("[data-action='copy']");
  const dlTxtBtn = actions.querySelector("[data-action='download-txt']");
  const dlSrtBtn = actions.querySelector("[data-action='download-srt']");

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

function parseTimeInput(str) {
  const trimmed = str.trim();
  if (!trimmed) return null;

  const patterns = [
    /^(\d+):(\d{2})(?::(\d{2}))?$/,
    /^(\d{1,2}):(\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3], 10) : 0;

      if (mins >= 0 && secs >= 0 && secs < 60 && ms >= 0 && ms < 60) {
        return mins * 60 + secs + ms / 100;
      }
    }
  }

  return null;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function seekAudio(timeSeconds) {
  const recPlayer = document.getElementById("recPlayer");
  const importPlayer = document.getElementById("importPlayer");
  const player = recPlayer?.src ? recPlayer : importPlayer;

  if (player && player.src) {
    player.currentTime = timeSeconds;
  }
}
