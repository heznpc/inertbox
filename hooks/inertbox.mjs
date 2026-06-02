#!/usr/bin/env node
// inertbox — Claude Code UserPromptSubmit hook (core-backed adapter).
//
// Thin adapter. The boundary logic lives in ../core (parse / detect / compile);
// this file only does Claude Code hook stdin/stdout and the hookSpecificOutput
// envelope. It does not duplicate boundary logic and does not claim complete
// prompt-injection prevention — the core render is delimiting-mode spotlighting
// (probabilistic, baseline hygiene).

import { process as buildBoundary, DEFAULT_MARKERS } from "../core/index.mjs";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let text = "";
  try {
    const input = JSON.parse(raw || "{}");
    // Field name differs across docs/versions; accept both rather than assert one.
    text = input.prompt ?? input.user_prompt ?? "";
  } catch {
    process.exit(0); // Malformed input: never block the operator's turn.
  }

  // Fast no-op: no marked block → stay silent (zero-overhead path), as before.
  if (typeof text !== "string" || !text.includes(DEFAULT_MARKERS.open)) {
    process.exit(0);
  }

  // Marked block(s): delegate the whole boundary pipeline to the core and emit
  // its spotlight render as Claude Code additionalContext.
  const { rendered } = buildBoundary(text, { targets: ["spotlight"] });

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: rendered.spotlight,
      },
    }),
  );
  process.exit(0);
});
