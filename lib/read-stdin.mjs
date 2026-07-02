// lib/read-stdin.mjs
// Robust synchronous stdin reader shared by the CLI (bin/) and the hook (hooks/).
//
// Why not readFileSync(0): on some shells / CI / agent harnesses fd 0 is left
// non-blocking, and a plain slurp then throws EAGAIN mid-read. This reader
// retries EAGAIN (with a bounded idle timeout so a stalled writer can't hang the
// process forever) and EINTR (a benign signal interruption — retry immediately),
// and maps any other error to the caller. It reads to EOF, so it handles inputs
// larger than one buffer.

import { readSync } from "node:fs";

const CHUNK = 65536;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;

// One blocking sleeper, allocated once. Prefer Atomics.wait on a SharedArrayBuffer
// (true sleep, no CPU spin); fall back to a busy spin where SAB is unavailable
// (e.g. runtimes without cross-origin isolation) so an EAGAIN never crashes here.
function makeSleeper() {
  try {
    const view = new Int32Array(new SharedArrayBuffer(4));
    return (ms) => {
      Atomics.wait(view, 0, 0, ms);
    };
  } catch {
    return (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        /* spin: SharedArrayBuffer unavailable */
      }
    };
  }
}

/**
 * Read all of stdin (fd 0) synchronously and return it as a Buffer.
 * @param {{ idleTimeoutMs?: number }} [opts]
 *   idleTimeoutMs  max time to keep retrying EAGAIN with no data before throwing
 *                  (guards against a non-blocking fd whose writer never sends EOF)
 * @returns {Buffer}
 */
export function readStdin(opts = {}) {
  const idleTimeoutMs = opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const sleep = makeSleeper();
  const buf = Buffer.allocUnsafe(CHUNK);
  const chunks = [];
  let idleMs = 0;

  for (;;) {
    let n;
    try {
      n = readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if (e.code === "EINTR") {
        continue; // interrupted by a signal; retry immediately, not an idle wait
      }
      if (e.code === "EAGAIN") {
        idleMs += 10;
        if (idleMs >= idleTimeoutMs) {
          throw new Error("timed out waiting for stdin (non-blocking fd with no data)");
        }
        sleep(10);
        continue;
      }
      throw e; // EIO, ENXIO, … — surface to the caller's error handling
    }
    idleMs = 0;
    if (n === 0) break; // EOF
    // Copy out of the reused buffer before the next read overwrites it.
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }

  return Buffer.concat(chunks);
}
