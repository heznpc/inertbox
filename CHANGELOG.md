# Changelog

All notable changes to Inertbox are documented here. This project is in early
public alpha.

## 0.1.0-alpha.0 — Unreleased

Initial public alpha.

### Added
- Surface-agnostic instruction/data boundary core (`core/`).
- `parse` / `detect` / `compile` / `process` pipeline.
- Heuristic English/Korean injection-like risk-span detection.
- Renderers: spotlight/plaintext, xml-like, Markdown, and JSON (structured).
- Delimiter-safety regression coverage (Markdown fences, xml-like escaping,
  spotlight collision avoidance, parse marker-collision advisory warning).
- Claude Code `UserPromptSubmit` hook as a core-backed thin adapter.
- Usage documentation and explicit non-goals.

### Non-goals
- Not prompt-injection prevention.
- Not a complete security control.
- Not an HTML sanitizer, CSP generator, sandbox, or output optimizer.

> It makes the boundary legible and portable. It does not make it obeyed.
