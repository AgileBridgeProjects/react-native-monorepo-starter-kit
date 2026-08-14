#!/usr/bin/env node
// Secret scan for pre-push / CI. Scans the files that changed on this branch
// (vs the base branch) rather than the whole repo — fast, and pre-commit already
// scans every staged file on commit. Pass `--all` to scan every tracked file.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
// Resolve the secretlint CLI so we can run it via `node` directly — avoids
// npx/.cmd resolution quirks when the hook runs under Git Bash on Windows.
// The package `exports` map blocks deep-resolving the bin, so go via package.json.
const pkgPath = require.resolve("secretlint/package.json");
const secretlintCli = path.join(path.dirname(pkgPath), "bin", "secretlint.js");

const BASE = process.env.SECRETLINT_BASE || "origin/dev";
const scanAll = process.argv.includes("--all");

function git(args) {
  const res = spawnSync("git", args, { encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : "";
}

let files;
if (scanAll) {
  files = git(["ls-files"]).split("\n");
} else {
  // Prefer diff against the merge-base with the base branch; fall back to all tracked.
  const mergeBase = git(["merge-base", BASE, "HEAD"]);
  const range = mergeBase
    ? git(["diff", "--name-only", "--diff-filter=ACMR", `${mergeBase}...HEAD`])
    : "";
  const staged = git(["diff", "--name-only", "--diff-filter=ACMR", "--cached"]);
  const unstaged = git(["diff", "--name-only", "--diff-filter=ACMR"]);
  const set = new Set(
    [range, staged, unstaged]
      .join("\n")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
  );
  files = set.size > 0 ? [...set] : git(["ls-files"]).split("\n");
}

files = files.filter(Boolean);
if (files.length === 0) {
  console.log("secretlint: no files to scan.");
  process.exit(0);
}

// Batch so we never overflow the OS command-line limit (Windows is ~8k chars).
const BATCH = 200;
let failed = false;
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const res = spawnSync(
    process.execPath,
    [secretlintCli, "--secretlintignore", ".secretlintignore", ...batch],
    { stdio: "inherit" },
  );
  if (res.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
