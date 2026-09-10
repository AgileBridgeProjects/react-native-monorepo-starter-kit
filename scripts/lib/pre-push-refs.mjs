/**
 * Git's pre-push stdin contract, parsed once.
 *
 * The hook reads the ref lines a single time and pipes the same string to more than one gate
 * (`pre-push-tag-skip.mjs`, `check-e2e-receipt.mjs`), so they must agree on what those lines
 * mean. They previously each had their own parser and their own `ZERO_SHA`: the same job twice,
 * one hook, one input.
 *
 * Format, one line per ref: `<local ref> <local sha> <remote ref> <remote sha>`.
 */

/** git's all-zero sha: as a local sha it means a deletion, as a remote sha a new ref. */
export const ZERO_SHA = '0000000000000000000000000000000000000000';

/**
 * @param {string} stdin
 * @returns {{ refs: { localRef: string, localSha: string, remoteRef: string, remoteSha: string }[],
 *             sawLines: boolean }}
 *
 * Deletions are dropped from `refs` — they push no commits — but still set `sawLines`, which is
 * what separates "git told us nothing" (fall back to a ref comparison) from "git told us about
 * deletions only" (genuinely nothing to check). Without that distinction a branch-deletion push
 * takes the fallback path and gets gated on an unrelated diff.
 */
export function parsePushRefs(stdin) {
  const refs = [];
  let sawLines = false;
  for (const line of String(stdin ?? '').split('\n')) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 4) continue;
    sawLines = true;
    const [localRef, localSha, remoteRef, remoteSha] = parts;
    if (localSha === ZERO_SHA) continue;
    refs.push({ localRef, localSha, remoteRef, remoteSha });
  }
  return { refs, sawLines };
}
