# Example: Claude Code `UserPromptSubmit` hook

A core-backed adapter kept as an **example** (it is not part of the npm package
and not the primary surface — that is the `inertbox` CLI).

What it does: on a prompt containing a `⟦EXT⟧ … ⟦/EXT⟧` marked block, it emits
the core spotlight render as `hookSpecificOutput.additionalContext`; on an
unmarked prompt it is a silent no-op.

Known limits:

- `UserPromptSubmit` hooks **add context; they do not replace the prompt** —
  the original marked text still reaches the model alongside the annotation.
- The fast no-op path recognizes the default `⟦EXT⟧` marker only.

To wire it manually, register the hook in your Claude Code settings with an
absolute path to this file, following the event/command shape in
[`hooks.json`](hooks.json). Smoke-tested by `test/smoke.mjs`.
