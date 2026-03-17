/**
 * Auris — export.js
 * =================
 * Generates and triggers download of TXT and SRT files
 * from the transcription segments.
 */

"use strict";

import { getSegments, getLanguage } from "./transcriber.js";
import { getEditedSegments, isEditing } from "./subtitle-editor.js";

// ── Public API ────────────────────────────────────────────

export function copyToClipboard() {
  const text = buildPlainText();
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector("[data-action='copy']");
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = "✓ Copied";
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
}

export function downloadTxt() {
  const text = buildPlainText();
  if (!text) return;
  triggerDownload("auris-transcript.txt", text, "text/plain;charset=utf-8");
}

export function downloadSrt() {
  const srt = buildSrt();
  if (!srt) return;
  triggerDownload("auris-transcript.srt", srt, "text/srt;charset=utf-8");
}

// ── Builders ──────────────────────────────────────────────

function buildPlainText() {
  const edited = isEditing() ? getEditedSegments() : null;
  const segments = edited ?? getSegments();
  if (!segments.length) return null;
  return segments.map(s => s.text.trim()).join("\n");
}

function buildSrt() {
  const edited = isEditing() ? getEditedSegments() : null;
  const segments = edited ?? getSegments();
  if (!segments.length) return null;

  return segments
    .map((seg, i) => {
      const [start, end] = seg.timestamp ?? [0, 0];
      return [
        i + 1,
        `${toSrtTime(start)} --> ${toSrtTime(end || start + 2)}`,
        seg.text.trim(),
        "",          // Blank line between cues
      ].join("\n");
    })
    .join("\n");
}

// ── Helpers ───────────────────────────────────────────────

/**
 * Convert seconds to SRT timestamp format: HH:MM:SS,mmm
 * @param {number} totalSeconds
 * @returns {string}
 */
function toSrtTime(totalSeconds) {
  const h   = Math.floor(totalSeconds / 3600);
  const m   = Math.floor((totalSeconds % 3600) / 60);
  const s   = Math.floor(totalSeconds % 60);
  const ms  = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":") + "," + ms.toString().padStart(3, "0");
}

/**
 * Trigger a file download in the browser.
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 */
function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href:     url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}