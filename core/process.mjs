// core/process.mjs
// Orchestration helper: parse -> detect (per block) -> attach risks -> compile.
// Keeps the single-responsibility split: this is the only place the three
// primitives are wired together. Adapters typically call just this.

import { parse } from "./parse.mjs";
import { detect } from "./detect.mjs";
import { compile } from "./compile.mjs";

/** @typedef {import('./types.mjs').ParseConfig} ParseConfig */
/** @typedef {import('./types.mjs').DetectConfig} DetectConfig */
/** @typedef {import('./types.mjs').CompileConfig} CompileConfig */
/** @typedef {import('./types.mjs').CompileResult} CompileResult */

/**
 * @param {string} input
 * @param {ParseConfig & DetectConfig & CompileConfig} [config]
 * @returns {CompileResult}
 */
export function process(input, config = {}) {
  const parsed = parse(input, config);
  const blocks = parsed.blocks.map((b) => ({
    id: b.id,
    source: b.source,
    content: b.content,
    risks: detect(b.content, config),
  }));
  const annotated = { instruction: parsed.instruction, blocks, warnings: parsed.warnings };
  return compile(annotated, config);
}
