/**
 * Auris — transcript-search.js
 * ============================
 * Live search within the transcript.
 * Filters visible segments and highlights matching text.
 *
 * Public API:
 *   initSearch()    — wire up the input listener, call once on DOMContentLoaded
 *   enableSearch()  — enable input after transcript is rendered
 *   disableSearch() — disable input during subtitle edit mode
 *   clearSearch()   — reset input and restore all segments
 */

"use strict";

// ── State ─────────────────────────────────────────────────

/** Original innerHTML of each .segment__text span, keyed by segment index */
const originalTexts = new Map();

// ── Public API ────────────────────────────────────────────

export function initSearch() {
  const input = getInput();
  if (!input) return;

  input.addEventListener("input", () => {
    runSearch(input.value);
  });

  // Clear on Escape
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      runSearch("");
      input.blur();
    }
  });
}

export function enableSearch() {
  const input = getInput();
  if (!input) return;

  // Snapshot original segment texts for highlight/restore
  snapshotSegments();

  input.disabled = false;
  input.value = "";
  setCount("");
}

export function disableSearch() {
  const input = getInput();
  if (!input) return;

  clearSearch();
  input.disabled = true;
}

export function clearSearch() {
  const input = getInput();
  if (input) input.value = "";
  restoreAllSegments();
  setCount("");
  originalTexts.clear();
}

// ── Core search ───────────────────────────────────────────

/**
 * Filter and highlight segments matching the query.
 * @param {string} query
 */
function runSearch(query) {
  const trimmed = query.trim();

  if (!trimmed) {
    restoreAllSegments();
    setCount("");
    return;
  }

  const segments = getSegmentEls();
  let matchCount = 0;

  segments.forEach((seg, idx) => {
    const textEl = seg.querySelector(".segment__text");
    if (!textEl) return;

    const original = originalTexts.get(idx) ?? textEl.textContent;
    const lowerOriginal = original.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();

    if (lowerOriginal.includes(lowerQuery)) {
      seg.style.display = "";
      textEl.innerHTML = highlightMatches(original, trimmed);
      matchCount++;
    } else {
      seg.style.display = "none";
      textEl.innerHTML = escapeHtml(original);
    }
  });

  const total = segments.length;
  setCount(matchCount === total ? "" : `${matchCount} / ${total}`);
}

// ── Helpers ───────────────────────────────────────────────

/**
 * Snapshot the text content of all current segments.
 * Must be called after renderTranscript populates the DOM.
 */
function snapshotSegments() {
  originalTexts.clear();
  getSegmentEls().forEach((seg, idx) => {
    const textEl = seg.querySelector(".segment__text");
    if (textEl) originalTexts.set(idx, textEl.textContent);
  });
}

/**
 * Restore all segments to visible with original unescaped text.
 */
function restoreAllSegments() {
  getSegmentEls().forEach((seg, idx) => {
    seg.style.display = "";
    const textEl = seg.querySelector(".segment__text");
    if (textEl) {
      const original = originalTexts.get(idx);
      if (original !== undefined) textEl.innerHTML = escapeHtml(original);
    }
  });
}

/**
 * Wrap all case-insensitive occurrences of query in <mark> tags.
 * @param {string} text     Original plain text
 * @param {string} query    Search term (not yet escaped)
 * @returns {string}        HTML string with <mark> highlights
 */
function highlightMatches(text, query) {
  const escapedQuery = escapeRegex(query);
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapeHtml(text).replace(
    new RegExp(`(${escapeRegex(escapeHtml(query))})`, "gi"),
    "<mark>$1</mark>"
  );
}

/** @returns {NodeListOf<Element>} */
function getSegmentEls() {
  return document.querySelectorAll("#transcriptBody .segment");
}

/** @returns {HTMLInputElement|null} */
function getInput() {
  return document.getElementById("transcriptSearch");
}

/** @param {string} text */
function setCount(text) {
  const el = document.getElementById("searchCount");
  if (el) el.textContent = text;
}

/**
 * Escape a string for safe insertion as HTML text content.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape a string for use inside a RegExp.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
