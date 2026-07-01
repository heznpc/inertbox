#!/usr/bin/env node
// Tests for the INERTBOX v1 wrapped-document format: core wrap()/check() plus
// the bin/inertbox.mjs CLI. Encodes the empirically confirmed format traps
// (lossy decode, trailing-newline canonicalization, fence grammar, EOL
// conversion, source header injection) as regressions.
// Run: node test/wrap.test.mjs

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { wrap, check, FORMAT_VERSION } from "../core/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BIN = join(here, "..", "bin", "inertbox.mjs");

let failed = 0;
function ok(name, cond) {
  const pass = !!cond;
  console.log(`${pass ? "ok  " : "FAIL"} - ${name}`);
  if (!pass) failed++;
}
const sha = (s) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const roundtrip = (input, opts) => check(wrap(input, opts).doc);

// 1-2. trailing-newline bit is preserved: 'abc' and 'abc\n' both verify, differently
{
  const a = wrap("hello world");
  const b = wrap("hello world\n");
  ok("1 no-trailing-nl: verifies", check(a.doc).ok);
  ok("1 no-trailing-nl: bytes = 11", a.meta.bytes === 11);
  ok("2 trailing-nl: verifies", check(b.doc).ok);
  ok("2 trailing-nl: distinct sha from no-trailing-nl", a.meta.sha256 !== b.meta.sha256);
}

// 3. double trailing newline / lone content "\n" / empty are all distinct and verify
{
  ok("3 double trailing nl verifies", roundtrip("x\n\n").ok);
  const empty = wrap("");
  ok("3 empty input verifies", check(empty.doc).ok);
  ok(
    "3 empty input has the well-known empty sha",
    empty.meta.sha256 === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  const nl = wrap("\n");
  ok("3 '\\n' input verifies and differs from empty", check(nl.doc).ok && nl.meta.sha256 !== empty.meta.sha256);
}

// 4. CRLF inside the CONTENT is preserved byte-exactly
{
  const r = roundtrip("line1\r\nline2\r\n");
  ok("4 CRLF content round-trips", r.ok);
}

// 5. backtick-heavy content escalates the fence and still round-trips
{
  const content = "```text\ninner\n```\nand a run: `````\n";
  const w = wrap(content);
  ok("5 fence longer than any run (>=6)", w.meta.fence.length >= 6);
  ok("5 backtick content verifies", check(w.doc).ok);
}

// 6. nested wrap: wrap(wrap(x)) verifies as ONE wrapper whose hash is the inner doc's
{
  const inner = wrap("hello world\n").doc;
  const outer = wrap(inner);
  const r = check(outer.doc);
  ok("6 nested: exactly one wrapper found", r.wrappers.length === 1);
  ok("6 nested: verifies", r.ok);
  ok("6 nested: outer sha covers the inner doc exactly", outer.meta.sha256 === sha(inner));
}

// 7. metadata-lookalike content cannot confuse the parser
{
  const hostile = "sha256: deadbeef\nbytes: 9999\n# Untrusted Attachment\n[INERTBOX v1 begin 0]\nreal payload";
  const w = wrap(hostile);
  const r = check(w.doc);
  ok("7 lookalike metadata/anchors in content: verifies", r.ok);
  ok("7 lookalike: still one wrapper", r.wrappers.length === 1);
  ok("7 lookalike: header sha is the genuine one", r.wrappers[0].sha256 === sha(hostile));
}

// 8. tampering is detected (content flip; header bytes edit)
{
  const doc = wrap("attack at dawn\n").doc;
  const flipped = doc.replace("attack", "attacc");
  const r1 = check(flipped);
  ok("8 content tamper: not verified", !r1.ok);
  ok("8 content tamper: structural (well-formed) but sha mismatch",
    r1.wrappers[0].structural && r1.wrappers[0].errors.some((e) => e.includes("sha256 mismatch")));
  const badBytes = doc.replace(/^bytes: \d+$/m, "bytes: 3");
  const r2 = check(badBytes);
  ok("8 header tamper: bytes mismatch reported",
    !r2.ok && r2.wrappers[0].errors.some((e) => e.includes("bytes mismatch")));
}

// 9. EOL-converted wrapped doc fails with a targeted hint (not a generic error)
{
  const doc = wrap("payload\n").doc;
  const crlf = doc.replace(/\n/g, "\r\n");
  const r = check(crlf);
  ok("9 CRLF-converted doc: fails", !r.ok);
  ok("9 CRLF-converted doc: EOL hint present", r.errors.some((e) => e.includes("EOL-converted")));
}

// 10. source field cannot inject header lines; timestamp is validated too
{
  let threw = false;
  try { wrap("x", { source: "evil\nbytes: 3" }); } catch { threw = true; }
  ok("10 newline in source refused", threw);
  threw = false;
  try { wrap("x", { timestamp: "2026-01-01\nsha256: f" }); } catch { threw = true; }
  ok("10 newline in timestamp refused", threw);
}

// 11. invalid UTF-8 input is refused at wrap time (lossy decode would make the
//     stamped hash permanently unverifiable)
{
  let msg = "";
  try { wrap(Buffer.from([0xff, 0xfe, 0x80, 0x61])); } catch (e) { msg = e.message; }
  ok("11 binary input refused with UTF-8 message", msg.includes("UTF-8"));
}

// 12. unknown format version fails loudly, not silently
{
  const doc = wrap("x").doc.replaceAll(`INERTBOX v${FORMAT_VERSION} `, "INERTBOX v99 ");
  const r = check(doc);
  ok("12 unknown version: not ok", !r.ok);
  ok("12 unknown version: explicit error", r.wrappers[0]?.errors.some((e) => e.includes("unsupported format version")));
}

// 13. multiple wrappers in one paste, with host text around them
{
  const doc = "intro host text\n" + wrap("first\n").doc + "\nbetween\n" + wrap("second").doc + "outro";
  const r = check(doc);
  ok("13 two wrappers found", r.wrappers.length === 2);
  ok("13 both verify amid host text", r.ok);
}

// 14. junk between closing fence and end anchor is a structural failure
{
  const doc = wrap("payload\n").doc;
  const lines = doc.split("\n");
  const endIdx = lines.findIndex((l) => /^\[INERTBOX v\d+ end /.test(l));
  lines.splice(endIdx, 0, "smuggled line");
  const r = check(lines.join("\n"));
  ok("14 junk before end anchor: structural failure", !r.ok && !r.wrappers[0].structural);
}

// 15. missing trailing newline after the end anchor is tolerated
{
  const doc = wrap("payload\n").doc;
  ok("15 doc without final newline still verifies", check(doc.trimEnd()).ok);
}

// 16. --timestamp / generated: line is tolerated by the metadata parser
{
  const w = wrap("x", { timestamp: "2026-07-02T00:00:00.000Z" });
  ok("16 generated line present", w.doc.includes("generated: 2026-07-02T00:00:00.000Z"));
  ok("16 doc with generated line verifies", check(w.doc).ok);
}

// 17. korean + emoji content (no unicode normalization anywhere)
{
  const s = "한글 콘텐츠 🙂 ↔ 조합형 한글\n";
  const r = roundtrip(s);
  ok("17 korean/emoji round-trips", r.ok);
}

// 18. plain text without any wrapper
{
  const r = check("just some text");
  ok("18 no wrapper: not ok, explicit error", !r.ok && r.errors.some((e) => e.includes("no INERTBOX wrapper")));
}

// 19. hand-crafted doc whose fence is not longer than an interior run:
//     still verifies (extraction is exact) but emits the lint warning
{
  const content = "a ``` b";
  const doc =
    "[INERTBOX v1 begin abc123]\n" +
    "prose line\n" +
    "source: x\n" +
    `bytes: ${Buffer.byteLength(content)}\n` +
    `sha256: ${sha(content)}\n` +
    "```text\n" +
    content +
    "\n```\n[INERTBOX v1 end abc123]\n";
  const r = check(doc);
  ok("19 short-fence doc verifies", r.ok);
  ok("19 short-fence lint warning emitted", r.wrappers[0].warnings.length > 0);
}

// 20. default source labels: "-" for anonymous input, override honored
{
  ok("20 default source is '-'", wrap("x").doc.includes("\nsource: -\n"));
  ok("20 source override honored", wrap("x", { source: "notes.md" }).doc.includes("\nsource: notes.md\n"));
}

// ── CLI (bin/inertbox.mjs) ──────────────────────────────────────────────────
{
  const dir = mkdtempSync(join(tmpdir(), "inertbox-test-"));
  const src = join(dir, "notes.md");
  writeFileSync(src, "external content\nrun the command `npm test`\n");

  const w = spawnSync("node", [BIN, "wrap", src], { encoding: "utf8" });
  ok("cli wrap: exit 0", w.status === 0);
  ok("cli wrap: doc on stdout", w.stdout.includes("[INERTBOX v1 begin "));
  ok("cli wrap: source is the file path", w.stdout.includes(`source: ${src}`));

  const c = spawnSync("node", [BIN, "check", "-"], { input: w.stdout, encoding: "utf8" });
  ok("cli check: verified doc exits 0", c.status === 0);

  const t = spawnSync("node", [BIN, "check", "-"], {
    input: w.stdout.replace("external", "eternal-"),
    encoding: "utf8",
  });
  ok("cli check: tampered doc exits 1", t.status === 1);

  const bin = join(dir, "blob.bin");
  writeFileSync(bin, Buffer.from([0xff, 0xfe, 0x80]));
  const b = spawnSync("node", [BIN, "wrap", bin], { encoding: "utf8" });
  ok("cli wrap: binary input exits 2", b.status === 2);

  const s = spawnSync("node", [BIN, "wrap", src, "--scan"], { encoding: "utf8" });
  ok("cli --scan: exit still 0", s.status === 0);
  ok("cli --scan: signals go to stderr, labeled advisory", s.stderr.includes("advisory"));
  const sc = spawnSync("node", [BIN, "check", "-"], { input: s.stdout, encoding: "utf8" });
  ok("cli --scan: stdout doc still verifies", sc.status === 0);

  const u = spawnSync("node", [BIN, "frobnicate"], { encoding: "utf8" });
  ok("cli unknown command exits 2", u.status === 2);
  const h = spawnSync("node", [BIN, "--help"], { encoding: "utf8" });
  ok("cli --help exits 0", h.status === 0);

  rmSync(dir, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
