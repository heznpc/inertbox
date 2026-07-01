// core/index.mjs
// Surface-agnostic core entry point. Adapters (Claude Code hook, browser
// extension, playground, React) depend on THIS — never the reverse.

export { parse } from "./parse.mjs";
export { detect } from "./detect.mjs";
export { compile, fenceFor } from "./compile.mjs";
export { process } from "./process.mjs";
export { wrap, check, FORMAT_VERSION } from "./wrap.mjs";
export { DEFAULT_MARKERS, ASCII_MARKERS } from "./types.mjs";
export { DEFAULT_RULES } from "./rules.mjs";
