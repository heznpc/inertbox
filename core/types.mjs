// core/types.mjs
// Surface-agnostic type contracts (JSDoc) + default constants.
// No runtime deps. No DOM / React / hook envelope / fetch / fs / network.

/** @typedef {{ open: string, close: string }} MarkerPair */
/** @typedef {{ open?: string, close?: string, aliases?: MarkerPair[] }} MarkerConfig */
/** @typedef {'conservative'|'fail-open'|'fail-closed'|'throw'} MalformedPolicy */
/** @typedef {{ markers?: MarkerConfig, onMalformed?: MalformedPolicy }} ParseConfig */

/** @typedef {{ start: number, end: number }} Span */
/** @typedef {{ kind: 'text',  content: string, span: Span }} TextSegment */
/** @typedef {{ kind: 'block', id: string, content: string, source?: string, span: Span }} BlockSegment */
/** @typedef {TextSegment | BlockSegment} Segment */
/** @typedef {{ code: string, message: string, span?: Span }} Warning */
/** @typedef {{ segments: Segment[], instruction: string, blocks: BlockSegment[], warnings: Warning[] }} ParseResult */

/** @typedef {'instruction-override'|'system-prompt-exfil'|'tool-invocation'|'role-manipulation'|'data-exfiltration'|'delimiter-injection'} RiskType */
/** @typedef {'low'|'medium'|'high'} Severity */
/** @typedef {{ start:number, end:number, type:RiskType, severity:Severity, snippet:string, ruleId:string }} RiskSpan */
/** @typedef {{ ruleId:string, type:RiskType, severity:Severity, locales:('en'|'ko')[], pattern:RegExp }} Rule */
/** @typedef {{ locales?:('en'|'ko')[], minSeverity?:Severity, rules?:Rule[] }} DetectConfig */

// compile() consumes an ALREADY-risk-attached structure (it does not run detect).
/** @typedef {{ id:string, source?:string, content:string, risks:RiskSpan[] }} AnnotatedBlock */
/** @typedef {{ instruction:string, blocks:AnnotatedBlock[], warnings?:Warning[] }} AnnotatedPrompt */

/** @typedef {'spotlight'|'xml'|'markdown'|'json'} RenderTarget */
/** @typedef {{ targets?:RenderTarget[], delimiter?:'random'|'fixed', includeRisks?:boolean, guidanceLocale?:'en'|'ko' }} CompileConfig */
/** @typedef {{ guidance:string, instruction:string, untrusted_blocks:Array<{id:string,source:string|null,content:string,risks:RiskSpan[]}>, note:string }} JsonRender */
/** @typedef {{ spotlight?:string, xml?:string, markdown?:string, json?:JsonRender }} RenderedFormats */
/** @typedef {{ instruction:string, blocks:AnnotatedBlock[], meta:{ hasRisks:boolean, blockCount:number, warnings:Warning[], delimiter:MarkerPair } }} CompiledPrompt */
/** @typedef {{ prompt:CompiledPrompt, rendered:RenderedFormats }} CompileResult */

/** Default marker pair (TEMPORARY — not a finalized syntax/brand decision). @type {MarkerPair} */
export const DEFAULT_MARKERS = { open: "⟦EXT⟧", close: "⟦/EXT⟧" };

/** ASCII alias candidate — structure is open for it; not finalized. @type {MarkerPair} */
export const ASCII_MARKERS = { open: "[[EXT]]", close: "[[/EXT]]" };
