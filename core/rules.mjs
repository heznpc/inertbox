// core/rules.mjs
// Small, extensible seed ruleset (English + Korean) for detect().
// These are HEURISTIC risk signals — not a security guarantee. False positives
// and false negatives are expected. Each rule carries a stable ruleId.

/** @typedef {import('./types.mjs').Rule} Rule */

/** @type {Rule[]} */
export const DEFAULT_RULES = [
  // ── instruction-override ────────────────────────────────────────────────
  { ruleId: "override.en.ignore-previous", type: "instruction-override", severity: "high", locales: ["en"],
    pattern: /\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above)\s+(?:instructions?|prompts?|messages?)\b/i },
  { ruleId: "override.en.disregard", type: "instruction-override", severity: "high", locales: ["en"],
    pattern: /\bdisregard\s+(?:the\s+)?(?:above|previous|prior|earlier)\b/i },
  { ruleId: "override.ko.ignore", type: "instruction-override", severity: "high", locales: ["ko"],
    pattern: /(?:이전|위|앞)\s*(?:의)?\s*(?:지시|명령|내용|프롬프트)[을를]?\s*무시/ },

  // ── system-prompt-exfil ─────────────────────────────────────────────────
  { ruleId: "exfil.en.system-prompt", type: "system-prompt-exfil", severity: "high", locales: ["en"],
    pattern: /\b(?:reveal|show|print|output|repeat|display)\b[\s\S]{0,24}\bsystem\s+prompt\b/i },
  { ruleId: "exfil.ko.system-prompt", type: "system-prompt-exfil", severity: "high", locales: ["ko"],
    pattern: /시스템\s*프롬프트[를을]?\s*(?:출력|공개|보여|알려|말해)/ },

  // ── tool-invocation ─────────────────────────────────────────────────────
  { ruleId: "tool.en.call", type: "tool-invocation", severity: "high", locales: ["en"],
    pattern: /\b(?:call|invoke|run|execute|trigger)\b[\s\S]{0,24}\b(?:tool|function|command|api)\b/i },
  { ruleId: "tool.ko.call", type: "tool-invocation", severity: "high", locales: ["ko"],
    pattern: /(?:도구|툴|함수|명령|커맨드)[을를]?\s*(?:호출|실행)/ },

  // ── role-manipulation ───────────────────────────────────────────────────
  { ruleId: "role.en.persona", type: "role-manipulation", severity: "medium", locales: ["en"],
    pattern: /\byou\s+are\s+now\b|\bact\s+as\b|\bpretend\s+to\s+be\b/i },
  { ruleId: "role.ko.persona", type: "role-manipulation", severity: "medium", locales: ["ko"],
    pattern: /지금부터\s*너[는은]|행세|인\s*척\s*(?:해|하)/ },

  // ── data-exfiltration ───────────────────────────────────────────────────
  { ruleId: "exfil.en.send", type: "data-exfiltration", severity: "high", locales: ["en"],
    pattern: /\b(?:send|email|post|upload|exfiltrate|leak)\b[\s\S]{0,24}\b(?:to|http|https|url|address)\b/i },
  { ruleId: "exfil.ko.send", type: "data-exfiltration", severity: "high", locales: ["ko"],
    pattern: /(?:전송|유출|업로드|전달|보내)[\s\S]{0,12}(?:해|하라|할|줘|주세요)/ },

  // ── delimiter-injection (fake role/instruction tags) ────────────────────
  { ruleId: "delim.fake-tag", type: "delimiter-injection", severity: "medium", locales: ["en", "ko"],
    pattern: /<\/?(?:system|user|assistant|instructions?)>|\[\/?INST\]|<\|[^|]*\|>|^#{3,}/im },
];
