// core/parse.mjs
// Split a single string into ordered segments (text | untrusted block).
// Pure: no I/O, no surface deps. Markers are configurable (MarkerConfig).
//
// Malformed policy (default 'conservative'):
//   - unclosed block  → treat from the open marker to EOF as an untrusted block + warning
//   - stray close     → leave as text + warning
//   - nested markers  → outer block wins; inner markers are literal content + warning

import { DEFAULT_MARKERS } from "./types.mjs";

/** @typedef {import('./types.mjs').ParseConfig} ParseConfig */
/** @typedef {import('./types.mjs').ParseResult} ParseResult */

function resolveMarkers(markers) {
  const open = markers?.open ?? DEFAULT_MARKERS.open;
  const close = markers?.close ?? DEFAULT_MARKERS.close;
  const pairs = [{ open, close }, ...(markers?.aliases ?? [])];
  return { opens: pairs.map((p) => p.open), closes: pairs.map((p) => p.close) };
}

/** Earliest occurrence at/after `from` of any token; longer token wins on a tie. */
function nextOf(str, from, tokens) {
  let best = -1;
  let bestTok = null;
  for (const t of tokens) {
    if (!t) continue;
    const idx = str.indexOf(t, from);
    if (idx === -1) continue;
    if (best === -1 || idx < best || (idx === best && t.length > bestTok.length)) {
      best = idx;
      bestTok = t;
    }
  }
  return best === -1 ? null : { index: best, token: bestTok };
}

/**
 * @param {string} input
 * @param {ParseConfig} [config]
 * @returns {ParseResult}
 */
export function parse(input, config = {}) {
  const { opens, closes } = resolveMarkers(config.markers);
  const policy = config.onMalformed ?? "conservative";
  const n = input.length;

  /** @type {import('./types.mjs').Segment[]} */ const segments = [];
  /** @type {import('./types.mjs').Warning[]} */ const warnings = [];
  /** @type {import('./types.mjs').BlockSegment[]} */ const blocks = [];
  let counter = 0;

  const pushText = (start, end) => {
    if (end <= start) return;
    segments.push({ kind: "text", content: input.slice(start, end), span: { start, end } });
    // stray close markers living in plain text (depth 0)
    let pos = start;
    for (;;) {
      const c = nextOf(input, pos, closes);
      if (!c || c.index >= end) break;
      warnings.push({
        code: "stray-close",
        message: `Close marker "${c.token}" has no matching open marker; treated as text.`,
        span: { start: c.index, end: c.index + c.token.length },
      });
      pos = c.index + c.token.length;
    }
  };

  const pushBlock = (openIdx, endIdx, content, nested) => {
    const id = "b" + counter++;
    const span = { start: openIdx, end: endIdx };
    const seg = { kind: "block", id, content, span };
    segments.push(seg);
    blocks.push(seg);
    if (nested) {
      warnings.push({
        code: "nested-marker",
        message: "Nested markers inside this block were treated as literal content.",
        span,
      });
    }
    return seg;
  };

  let i = 0;
  while (i < n) {
    const open = nextOf(input, i, opens);
    if (!open) {
      pushText(i, n);
      break;
    }
    if (open.index > i) pushText(i, open.index);

    const openIdx = open.index;
    const contentStart = openIdx + open.token.length;
    let depth = 1;
    let nested = false;
    let closeStart = -1;
    let closeTok = null;
    let j = contentStart;

    while (j < n && depth > 0) {
      const o = nextOf(input, j, opens);
      const c = nextOf(input, j, closes);
      if (!c) break; // no close remains → unclosed
      if (o && o.index < c.index) {
        depth++;
        nested = true;
        j = o.index + o.token.length;
      } else {
        depth--;
        if (depth === 0) {
          closeStart = c.index;
          closeTok = c.token;
        }
        j = c.index + c.token.length;
      }
    }

    if (depth > 0) {
      // unclosed
      if (policy === "throw") throw new Error(`Unclosed block at offset ${openIdx}`);
      const content = input.slice(contentStart, n);
      pushBlock(openIdx, n, content, nested);
      warnings.push({
        code: "unclosed-block",
        message: `Open marker "${open.token}" has no matching close; treated as untrusted through end of input.`,
        span: { start: openIdx, end: n },
      });
      i = n;
    } else {
      const content = input.slice(contentStart, closeStart);
      const blockEnd = closeStart + closeTok.length;
      pushBlock(openIdx, blockEnd, content, nested);
      i = blockEnd;
    }
  }

  const instruction = segments
    .filter((s) => s.kind === "text")
    .map((s) => s.content)
    .join("");

  return { segments, instruction, blocks, warnings };
}
