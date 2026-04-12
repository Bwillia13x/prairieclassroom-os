/**
 * evidence-snapshot.ts — Copies the current docs/evidence/ directory to a
 * timestamped snapshot under output/evidence-snapshots/YYYY-MM-DD/.
 *
 * Usage:
 *   npx tsx scripts/evidence-snapshot.ts
 */

import path from "node:path";
import fs from "node:fs";

const EVIDENCE_DIR = path.resolve("docs/evidence");
const SNAPSHOTS_DIR = path.resolve("output/evidence-snapshots");

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    console.error(
      "No evidence directory found. Run `npm run evidence:generate` first.",
    );
    process.exit(1);
  }

  const destDir = path.join(SNAPSHOTS_DIR, today());
  copyDir(EVIDENCE_DIR, destDir);
  console.log(`Snapshot saved to ${destDir}/`);
}

main();
