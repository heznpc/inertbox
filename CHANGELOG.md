# Changelog

All notable changes to Inertbox are documented here. This project is in early
public alpha.

## 0.2.0-alpha.0 — 2026-07-02

### Added
- Sender-side trailing guidance line after the INERTBOX end anchor. The v1
  wrapper body and hash domain are unchanged; `check` continues to tolerate v1
  documents without the trailing line.
- First-class Claude Code `UserPromptSubmit` check-on-paste hook at
  `hooks/check-on-paste.mjs`, with `hooks/hooks.json` wiring and
  `.claude-plugin/plugin.json` manifest packaging.
- Hook smoke coverage for no-wrapper, intact wrapper, tampered wrapper,
  overlong hostile source labels, and malformed hook stdin.
- README Cross-AI paste helpers (`iwx`, `iwc`, `iw`) with exact-version npm
  fallback, failure-safe clipboard writes, and final-newline restoration.
- Source label convention: namespaced structural labels (`zoint:`, `ci:`,
  `mcp:`) vs bare human-claimed labels; ≤ 64 characters; still a claim, never
  proof of provenance.

### Changed
- README now documents the first-class hook honestly: it adds context only, does
  not replace the prompt, and does not prevent injection or prove provenance.
- Example Claude Code marker hook docs now point INERTBOX wrapped-document users
  to the first-class hook.

### Fixed
- CLI stdin reads now retry transient `EAGAIN` results so shell pipelines such
  as `wrap - | check -` remain stable on nonblocking stdin fds.

## 0.1.0-alpha.0 — 2026-07-02

Initial public alpha.

### Added
- `inertbox` CLI: `wrap` (file/stdin → INERTBOX v1 wrapped document, with
  `--source`, `--timestamp`, `--scan` opt-ins) and `check` (structure lint +
  bytes + sha256 verification; exit codes 0/1/2).
- INERTBOX v1 wrapped-document format: versioned content-derived anchors,
  non-normative guidance prose, `source`/`bytes`/`sha256` metadata run,
  computed collision-safe fence, always-one-LF newline canonicalization,
  byte-exact verification (invalid UTF-8 refused at wrap time), targeted
  EOL-conversion diagnostics, source-field header-injection refusal.
- Wrap/CLI regression suite (50 checks) encoding the empirically confirmed
  format traps: trailing-newline bit, nested wraps, metadata-lookalike
  content, CRLF conversion, tampering, unknown format version.
- Surface-agnostic instruction/data boundary core (`core/`).
- `parse` / `detect` / `compile` / `process` pipeline.
- Heuristic English/Korean injection-like risk-span detection (CLI: opt-in
  `--scan` only; never on by default).
- Renderers: spotlight/plaintext, xml-like, Markdown, and JSON (structured).
- Delimiter-safety regression coverage (Markdown fences, xml-like escaping,
  spotlight collision avoidance, parse marker-collision advisory warning).
- Claude Code `UserPromptSubmit` hook as a core-backed example adapter.
- Usage documentation and explicit non-goals.

### Changed
- Repositioned as a wrapping utility: the `wrap`/`check` CLI is the product
  surface; the boundary-object pipeline is the library underneath.
- Compile delimiter mode `random` renamed to `derived` (it was always
  deterministic and content-derived; the old name was misleading).
- Claude Code hook demoted from `hooks/` to `examples/claude-code-hook/`;
  the `inertbox-hook` bin entry was replaced by the `inertbox` CLI.

### Non-goals
- Not prompt-injection prevention.
- Not a complete security control.
- Not an HTML sanitizer, CSP generator, sandbox, or output optimizer.

> It makes the boundary legible and portable. It does not make it obeyed.
