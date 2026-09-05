#!/usr/bin/env node
// Regenerates architecture/context.png and architecture/containers.png from
// architecture/workspace.dsl. Run this (`npm run diagram`) whenever a
// container, external dependency, or major relationship changes, and commit
// the updated PNGs alongside your code change — the DSL is the source of
// truth, the PNGs are what actually render in the README.
//
// Requires: a JDK on PATH (for Structurizr CLI, downloaded/cached
// automatically on first run) and the @mermaid-js/mermaid-cli devDependency
// (already in package.json — `npm install` pulls it in).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ARCH_DIR = path.join(ROOT, "architecture");
const DSL_PATH = path.join(ARCH_DIR, "workspace.dsl");
const EXPORT_DIR = path.join(ARCH_DIR, ".export");
const CLI_CACHE_DIR = path.join(ROOT, ".cache", "structurizr-cli");
const CLI_ZIP_URL =
  "https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip";

// View name (as declared in workspace.dsl's `views` block) -> output PNG.
const VIEWS = {
  Context: "context.png",
  Containers: "containers.png",
};

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  return execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

function ensureJava() {
  try {
    execFileSync("java", ["-version"], { stdio: "ignore" });
  } catch {
    console.error(
      "Java is required to run Structurizr CLI (validates/exports workspace.dsl).\n" +
        "Install a JDK (e.g. `brew install openjdk`) and re-run `npm run diagram`.",
    );
    process.exit(1);
  }
}

function ensureStructurizrCli() {
  const script = platform() === "win32" ? "structurizr.bat" : "structurizr.sh";
  const cliPath = path.join(CLI_CACHE_DIR, script);
  if (existsSync(cliPath)) return cliPath;

  console.log("Structurizr CLI not cached — downloading (one-time, ~100MB)...");
  mkdirSync(CLI_CACHE_DIR, { recursive: true });
  const zipPath = path.join(CLI_CACHE_DIR, "structurizr-cli.zip");
  run("curl", ["-sSL", "-o", zipPath, CLI_ZIP_URL]);
  run("unzip", ["-q", "-o", zipPath, "-d", CLI_CACHE_DIR]);
  rmSync(zipPath);
  if (platform() !== "win32") run("chmod", ["+x", cliPath]);
  return cliPath;
}

function main() {
  ensureJava();
  const structurizr = ensureStructurizrCli();

  console.log("\nValidating workspace.dsl...");
  run(structurizr, ["validate", "-w", DSL_PATH]);

  console.log("\nExporting views to Mermaid...");
  rmSync(EXPORT_DIR, { recursive: true, force: true });
  mkdirSync(EXPORT_DIR, { recursive: true });
  run(structurizr, ["export", "-w", DSL_PATH, "-f", "mermaid", "-o", EXPORT_DIR]);

  const mmdc = path.join(ROOT, "node_modules", ".bin", "mmdc");
  if (!existsSync(mmdc)) {
    console.error(
      "@mermaid-js/mermaid-cli isn't installed — run `npm install` first.",
    );
    process.exit(1);
  }

  console.log("\nRendering PNGs...");
  for (const file of readdirSync(EXPORT_DIR)) {
    const match = file.match(/^structurizr-(.+)\.mmd$/);
    if (!match) continue;
    const viewName = match[1];
    const outFile = VIEWS[viewName];
    if (!outFile) {
      console.warn(`No output mapping for view "${viewName}" — add one to VIEWS in this script. Skipping.`);
      continue;
    }
    run(mmdc, [
      "-i",
      path.join(EXPORT_DIR, file),
      "-o",
      path.join(ARCH_DIR, outFile),
      "-b",
      "white",
      "-s",
      "3",
      "-p",
      path.join(ROOT, "scripts", "mermaid-puppeteer-config.json"),
    ]);
  }

  rmSync(EXPORT_DIR, { recursive: true, force: true });
  console.log("\nDone — architecture/*.png regenerated from workspace.dsl.");
}

main();
