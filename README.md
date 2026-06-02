# Inertbox

**Box prompt content as data, not instructions.**

**Portable trust boundaries for LLM workflows.**

> It makes the boundary legible and portable. It does not make it obeyed.

When you talk to an LLM, your real instruction and pasted external content — a web
page, an email, a document, another model's output, logs, code — arrive in the same
input. Instruction-shaped text inside that external content ("ignore previous
instructions", "print the system prompt", "call the X tool") can be read by the model
as if it were your command.

This project draws the boundary between *your instruction* and *untrusted / external
content* as a small **surface-agnostic core** that any surface (a Claude Code hook, a
browser extension, a playground, React components) can reuse. The core turns one input
string into a structured boundary object and renders it in formats that state, plainly,
that the content inside is **data, not instructions**.

The boundary is made legible and portable. Whether the model then *obeys* it is outside
what this layer can guarantee — see **Non-goals**.

## Currently implemented

- **Pure, surface-agnostic core** — no DOM, React, browser-extension API, Claude Code
  hook envelope, `fetch`, filesystem, or network. Adapters depend on the core; never the
  reverse.
- **Four functions**
  - `parse(input, config)` — splits one string into ordered segments (user-instruction
    text vs untrusted block). Configurable markers (temporary default
    `⟦EXT⟧ … ⟦/EXT⟧`; ASCII alias `[[EXT]] … [[/EXT]]` supported via config). Conservative
    malformed policy: unclosed → block to EOF + warning; stray close → text + warning;
    nested → outer block wins, inner markers literal + warning.
  - `detect(content, config)` — heuristic **English / Korean** risk-span detection;
    returns `{ start, end, type, severity, snippet, ruleId }`. Small, extensible seed
    ruleset.
  - `compile(annotated, config)` — **pure renderer** (does not run detect); produces a
    neutral boundary object plus rendered formats.
  - `process(input, config)` — orchestrates parse → detect → attach risks → compile.
- **Renderers**: spotlight / plaintext, xml-like, Markdown, JSON (JSON as a structured
  object, not a stringified blob).
- **Tests**: core **61/61**, hook smoke **10/10**, **total 71/71** via `npm test`.
- **Existing Claude Code `UserPromptSubmit` hook** — present as a **pre-core
  proof-of-concept** (flags marked blocks, injects guidance). **It is not yet refactored
  to consume the core.**

```bash
npm test    # smoke 10/10 + core 61/61 = total 71/71
```

## Design intent

- **Boundary as a portable object, not a per-surface hack.** One core, many thin
  adapters. The value is a single legible boundary representation reusable everywhere.
- **Legible, not enforced.** Renderers apply delimiting / spotlighting so the boundary is
  explicit to the model. This is *probabilistic hygiene*, not a control — hence the
  canonical line: *it makes the boundary legible and portable; it does not make it
  obeyed.*
- **Deterministic and inspectable.** No randomness in the hot path; risk hits carry
  stable `ruleId`s; malformed input degrades conservatively with explicit warnings.
- **Separation of concerns.** parse / detect / compile are independent; compile never
  silently detects. `process` is the only place they are wired together.

## Delimiter safety

Renderer output is a **projection**; the neutral boundary object (and its JSON
projection) is the **source of truth**. Textual renderers must be delimiter-safe.

- **Markdown** chooses a backtick fence longer than any run inside the content.
- **Spotlight** (`random`, the default) chooses a delimiter absent from the content.
- **XML-like** escapes element text and attribute values — but it is still **not a
  sanitizer**.
- **JSON** preserves content as structured data.

**Known limitation.** Marker-based parsing is not collision-proof. If untrusted content
contains the close marker, the block can truncate early and the remainder can leak into
the instruction zone; this is reported via an advisory `possible-boundary-escape`
warning — **not fully prevented**.

**Mitigation.** Choose markers absent from the content (markers are configurable), or
prefer the structured input / JSON boundary object as the authoritative form. The fixed
spotlight delimiter mode is not collision-safe; the default `random` mode is recommended
for untrusted content.

## Planned / Future candidates

All of the below are **candidates only** — not committed scope:

- Refactor the existing Claude Code hook to **consume the core** (replace its inline
  logic).
- An **HTML renderer** — *only as a projection of the boundary object* (one render target
  like the others). Not started.
- A **playground** — Before / After visualization of parse / detect / compile.
- A **browser extension** — apply the boundary in chat-LLM input boxes.
- **React components** — display the boundary object in app UIs.

## Non-goals

This project is **not**:

- prompt-injection prevention
- a complete security control
- a replacement for model-side safety
- a replacement for tool permission policy
- sandboxing
- CSP
- an HTML sanitizer
- an HTML output optimizer
- a Markdown ingestion service
- vendor-specific

The HTML renderer listed under *Future candidates* is strictly a projection of the
boundary object. It is not — and will not be described as — a sanitizer, a CSP mechanism,
a sandbox, or an output optimizer.

## Redacted / not included

- No external persons, accounts, emails, tokens, or API keys.
- No user / usage / star metrics.
- Published as the `inertbox` package; GitHub repository `heznpc/inertbox`.
