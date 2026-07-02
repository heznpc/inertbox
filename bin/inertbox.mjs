#!/usr/bin/env node
// inertbox — wrap external text before you paste it into a coding agent.
//
// Thin I/O adapter: argv + file/stdin reading + exit codes live here; the
// format itself (wrap / check) lives in ../core/wrap.mjs.
//
// Exit codes: 0 = ok / verified, 1 = malformed or verification failure,
//             2 = usage or input error.

import { readFileSync, readSync } from "node:fs";
import { wrap, check, detect, FORMAT_VERSION } from "../core/index.mjs";

function usage(code) {
  const out = code === 0 ? process.stdout : process.stderr;
  out.write(`inertbox — wrap external text before you paste it into a coding agent

Usage:
  inertbox wrap [file|-] [--source NAME] [--timestamp] [--scan]
  inertbox check [file|-]

wrap    Read a text file (or stdin when the file is "-" or omitted) and print
        an INERTBOX v${FORMAT_VERSION} wrapped document to stdout.
          --source NAME   override the source label (default: file path, or "-")
          --timestamp     add a "generated:" ISO-8601 line to the header
          --scan          print heuristic risk signals to stderr (advisory only;
                          false positives are expected on ordinary dev text)
check   Verify a wrapped document: structure first, then bytes + sha256.
        Exit 0 = verified, 1 = malformed or mismatch, 2 = usage error.

Example:
  pbpaste | inertbox wrap - | pbcopy    # wrap whatever you were about to paste
`);
  process.exit(code);
}

function fail(msg, code) {
  process.stderr.write(`inertbox: ${msg}\n`);
  process.exit(code);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readStdin() {
  const chunks = [];
  const buf = Buffer.allocUnsafe(65536);
  for (;;) {
    let n;
    try {
      n = readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if (e.code === "EAGAIN") {
        sleep(10);
        continue;
      }
      throw e;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks);
}

function readInput(fileArg) {
  if (fileArg === undefined || fileArg === "-") {
    if (process.stdin.isTTY) fail("no input file and stdin is a terminal (see: inertbox --help)", 2);
    return { buf: readStdin(), defaultSource: "-" };
  }
  try {
    return { buf: readFileSync(fileArg), defaultSource: fileArg };
  } catch (e) {
    fail(`cannot read ${JSON.stringify(fileArg)}: ${e.code ?? e.message}`, 2);
  }
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
  usage(argv.length === 0 ? 2 : 0);
}

const cmd = argv.shift();
const flags = { scan: false, timestamp: false, source: undefined };
const positional = [];
while (argv.length) {
  const a = argv.shift();
  if (a === "--scan") flags.scan = true;
  else if (a === "--timestamp") flags.timestamp = true;
  else if (a === "--source") {
    if (!argv.length) fail("--source requires a value", 2);
    flags.source = argv.shift();
  } else if (a === "--help" || a === "-h") usage(0);
  else if (a.startsWith("-") && a !== "-") fail(`unknown flag ${JSON.stringify(a)}`, 2);
  else positional.push(a);
}
if (positional.length > 1) fail("expected at most one input file", 2);

if (cmd === "wrap") {
  const { buf, defaultSource } = readInput(positional[0]);
  let result;
  try {
    result = wrap(buf, {
      source: flags.source ?? defaultSource,
      ...(flags.timestamp ? { timestamp: new Date().toISOString() } : {}),
    });
  } catch (e) {
    fail(e.message, 2);
  }
  for (const w of result.meta.warnings) process.stderr.write(`inertbox: warning: ${w.message}\n`);
  if (flags.scan) {
    const text = buf.toString("utf8");
    const risks = detect(text);
    process.stderr.write(
      `inertbox scan: ${risks.length} heuristic signal(s) — advisory only; false positives are expected on ordinary dev text\n`,
    );
    for (const r of risks) {
      process.stderr.write(`  - ${r.ruleId} (${r.type}/${r.severity}): ${JSON.stringify(r.snippet)}\n`);
    }
  }
  process.stdout.write(result.doc);
  process.exit(0);
} else if (cmd === "check") {
  if (flags.scan || flags.timestamp || flags.source !== undefined) {
    fail("check takes no flags", 2);
  }
  const { buf } = readInput(positional[0]);
  const result = check(buf);
  for (const e of result.errors) process.stderr.write(`inertbox: ${e}\n`);
  for (const w of result.wrappers) {
    const label = w.source ?? "(unknown source)";
    if (w.verified) {
      process.stderr.write(`ok   - ${label} (${w.bytes} bytes, sha256 verified)\n`);
    } else {
      process.stderr.write(`FAIL - ${label}: ${w.errors.join("; ")}\n`);
    }
    for (const warn of w.warnings) process.stderr.write(`       warning: ${warn}\n`);
  }
  process.exit(result.ok ? 0 : 1);
} else {
  fail(`unknown command ${JSON.stringify(cmd)} (expected "wrap" or "check")`, 2);
}
