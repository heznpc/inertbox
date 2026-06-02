// core/detect.mjs
// Heuristic detection of injection-like phrases inside untrusted content.
// Returns RiskSpan metadata. This is a RISK SIGNAL, not a security guarantee.

import { DEFAULT_RULES } from "./rules.mjs";

/** @typedef {import('./types.mjs').DetectConfig} DetectConfig */
/** @typedef {import('./types.mjs').RiskSpan} RiskSpan */

const RANK = { low: 0, medium: 1, high: 2 };

/**
 * @param {string} content
 * @param {DetectConfig} [config]
 * @returns {RiskSpan[]}
 */
export function detect(content, config = {}) {
  if (typeof content !== "string" || content.length === 0) return [];
  const locales = config.locales ?? ["en", "ko"];
  const minSeverity = config.minSeverity ?? "low";
  const rules = config.rules ?? DEFAULT_RULES;

  /** @type {RiskSpan[]} */ const out = [];
  for (const rule of rules) {
    if (!rule.locales.some((l) => locales.includes(l))) continue;
    if (RANK[rule.severity] < RANK[minSeverity]) continue;

    const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g";
    const re = new RegExp(rule.pattern.source, flags);
    for (const m of content.matchAll(re)) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        type: rule.type,
        severity: rule.severity,
        snippet: m[0].slice(0, 80),
        ruleId: rule.ruleId,
      });
    }
  }

  out.sort((a, b) => a.start - b.start || a.end - b.end);
  const seen = new Set();
  return out.filter((r) => {
    const k = `${r.start}:${r.end}:${r.ruleId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
