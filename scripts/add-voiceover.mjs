#!/usr/bin/env node
/**
 * Add a macOS `say`-generated voiceover to the walkthrough video.
 *
 * Usage:
 *   node scripts/add-voiceover.mjs [path/to/video.mp4]
 *
 * If the path is omitted, the newest walkthrough-*.mp4 in qa/demo-script/videos
 * is used. A matching walkthrough-*.timing.json manifest must live next to it.
 *
 * Flow:
 *   1. Load the timing manifest.
 *   2. For each narration beat, run `say` to write an aiff.
 *   3. Measure each aiff duration and warn if it overflows its video slot.
 *   4. Build an ffmpeg filter_complex that delays each beat to its timestamp
 *      and mixes them into a single track.
 *   5. Mux that track into the mp4 (replacing the silent audio).
 *   6. Write the result as <video>-voiceover.mp4.
 *
 * Customization:
 *   - Edit NARRATIONS below to rewrite the voiceover text.
 *   - Edit VOICE / SPEAKING_RATE for a different voice or pace.
 *     List voices with `say -v '?'` — Samantha/Alex/Karen/Fiona/Daniel are
 *     good starting points on recent macOS.
 */

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const VIDEO_DIR = join(REPO_ROOT, "qa/demo-script/videos");

// ─────────────────────────────────────────────────────────────────────────
// VOICE CONFIG — edit these to change voice, pace, or narration text
// ─────────────────────────────────────────────────────────────────────────
const VOICE = "Samantha";   // `say -v '?'` to list; try Alex, Karen, Fiona
const SPEAKING_RATE = 180;  // words/min; 150–180 is human-paced

// Each entry maps to a beat in walkthrough-*.timing.json. The `mark` is the
// timing-manifest key where the narration should start. Word budget is the
// video slot duration × (SPEAKING_RATE / 60); stay within it or audio will
// overflow into the next beat.
const NARRATIONS = [
  {
    key: "N1-hero",
    mark: "todayHero",        // 2.674s · slot 12.52s
    text:
      "A grade three-four teacher in Alberta walks into her classroom. " +
      "Twenty-six students. Eight English learners. Ninety-four open " +
      "threads. Seventy minutes until today's real test.",
  },
  {
    key: "N2-dayarc",
    mark: "todayDayArc",      // 15.192s
    text:
      "PrairieClassroom OS draws the day as a shape. Each hill is a block. " +
      "The tallest hill is that ten a m math block. And every student on " +
      "it needs to be reached first.",
  },
  {
    key: "N3-debt",
    mark: "todayDebt",        // 25.722s
    text:
      "The app tracks classroom complexity the way an engineer tracks " +
      "technical debt. Ninety-four items this morning, down thirty from " +
      "yesterday. The teacher didn't magic them away. She handled them one " +
      "at a time, with the copilot helping her see which ones actually " +
      "mattered.",
  },
  {
    key: "N4-differentiate",
    mark: "differentiateNav", // 41.948s
    text:
      "Here is what Gemma four does when it is the right model for the job. " +
      "The teacher drops in the morning's reading passage, tells the copilot " +
      "what she needs — a scaffolded version for Amira, who is still " +
      "building English — and Gemma four B, running entirely on her laptop, " +
      "generates four variants in under two seconds. A core version. An " +
      "E S L supported version with sentence frames. A chunked step-by-step " +
      "version. And a small-group variant the E A can run. No cloud call. " +
      "No student data leaving the classroom.",
  },
  {
    key: "N5-family",
    mark: "familyMessageNav", // 74.553s
    text:
      "When the teacher wants to send good news home, the copilot drafts " +
      "the message in her voice, then translates it into the family's home " +
      "language. Punjabi. Tagalog. Arabic. Ukrainian. Eight languages, all " +
      "generated on device. But here is the rule the product will not break: " +
      "nothing is ever sent automatically. Every word that leaves this " +
      "classroom passes through the teacher first. The copilot drafts. The " +
      "teacher decides. Agency stays where it belongs.",
  },
  {
    key: "N6-ea",
    mark: "eaBriefingNav",    // 107.497s
    text:
      "Two models work together. The four B runs live, differentiating " +
      "content and drafting messages in seconds. The twenty-seven B handles " +
      "the harder problem: who sits with which student, when. Here it has " +
      "generated a timestamped daily briefing for the educational assistant " +
      "— every block, every transition, every student to watch. And here it " +
      "has distributed the cognitive load across the morning so no single " +
      "E A is overwhelmed. This is dual-speed Gemma four.",
  },
  {
    key: "N7-forecast",
    mark: "forecastNav",      // 140.293s
    text:
      "The copilot also looks ahead. A five-day complexity forecast. Green " +
      "means stable. Amber means watch. Red means this block is going to be " +
      "a test, and the teacher should plan for it now, not on Thursday when " +
      "it hits.",
  },
  {
    key: "N8-close",
    mark: "closeLightThemeNav", // 156.544s · slot 16.78s
    text:
      "PrairieClassroom OS runs on the laptop the teacher already owns. No " +
      "cloud by default. No student data leaving the building. Classroom " +
      "complexity is a coordination problem. Drop the coordination load, " +
      "and teachers get their afternoons back.",
  },
];
// ─────────────────────────────────────────────────────────────────────────

function locateVideoAndManifest(explicit) {
  if (explicit) {
    const mp4 = explicit;
    const base = mp4.replace(/\.mp4$/, "");
    const manifest =
      (existsSync(`${base}.timing.json`) && `${base}.timing.json`) ||
      (existsSync(`${base}.webm.timing.json`) && `${base}.webm.timing.json`) ||
      (existsSync(base.replace(/\.mp4$/, ".webm.timing.json"))
        ? base.replace(/\.mp4$/, ".webm.timing.json")
        : null);
    if (!manifest) {
      throw new Error(
        `No timing manifest found next to ${mp4}. Re-run scripts/record-demo-video.mjs to regenerate.`,
      );
    }
    return { mp4, manifest };
  }
  // Pick the newest walkthrough-*.mp4 that has a sibling .timing.json.
  const candidates = readdirSync(VIDEO_DIR)
    .filter((f) => f.startsWith("walkthrough-") && f.endsWith(".mp4"))
    .map((f) => ({ f, mtime: statSync(join(VIDEO_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const { f } of candidates) {
    const mp4 = join(VIDEO_DIR, f);
    const stem = mp4.replace(/\.mp4$/, "");
    const candidates2 = [
      `${stem}.timing.json`,
      `${stem}.webm.timing.json`,
    ];
    for (const m of candidates2) if (existsSync(m)) return { mp4, manifest: m };
  }
  throw new Error(
    "Could not find a recent walkthrough-*.mp4 with a sibling .timing.json. " +
      "Run scripts/record-demo-video.mjs first.",
  );
}

function ffprobeDurationSeconds(path) {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      path,
    ],
    { encoding: "utf8" },
  ).trim();
  return Number.parseFloat(out);
}

function synthesizeBeat(outDir, beat) {
  const aiff = join(outDir, `${beat.key}.aiff`);
  execFileSync("say", [
    "-v",
    VOICE,
    "-r",
    String(SPEAKING_RATE),
    "-o",
    aiff,
    beat.text,
  ]);
  return aiff;
}

function main() {
  const explicit = process.argv[2];
  const { mp4, manifest } = locateVideoAndManifest(explicit);
  console.log(`[voiceover] video    : ${mp4}`);
  console.log(`[voiceover] manifest : ${manifest}`);

  const { beats } = JSON.parse(readFileSync(manifest, "utf8"));
  const markMap = new Map(beats.map((b) => [b.beat, b.offsetMs]));
  const videoDurationMs = markMap.get("end") ?? Math.round(ffprobeDurationSeconds(mp4) * 1000);

  // Resolve each narration beat to an absolute timestamp.
  const resolved = NARRATIONS.map((n) => {
    const offsetMs = markMap.get(n.mark);
    if (offsetMs == null) {
      throw new Error(`Timing manifest missing mark "${n.mark}" for ${n.key}`);
    }
    return { ...n, offsetMs };
  });

  // Temp dir for intermediate aiffs.
  const workDir = mkdtempSync(join(tmpdir(), "prairie-voiceover-"));
  console.log(`[voiceover] workdir  : ${workDir}`);

  // Synthesize + measure each beat. Warn on overflow.
  console.log("[voiceover] synthesizing beats with macOS say…");
  const synth = [];
  for (let i = 0; i < resolved.length; i++) {
    const beat = resolved[i];
    const aiff = synthesizeBeat(workDir, beat);
    const durSec = ffprobeDurationSeconds(aiff);
    const nextOffsetMs =
      i + 1 < resolved.length ? resolved[i + 1].offsetMs : videoDurationMs;
    const slotSec = (nextOffsetMs - beat.offsetMs) / 1000;
    const headroom = slotSec - durSec;
    const mark = headroom >= 0 ? "✓" : "✗ OVERFLOW";
    console.log(
      `  ${mark} ${beat.key.padEnd(20)} ` +
        `start ${(beat.offsetMs / 1000).toFixed(2).padStart(6)}s  ` +
        `narr ${durSec.toFixed(2).padStart(5)}s / slot ${slotSec
          .toFixed(2)
          .padStart(5)}s  ` +
        `(headroom ${headroom.toFixed(2)}s)`,
    );
    synth.push({ ...beat, aiff, durSec });
  }

  // Build ffmpeg filter_complex. Each beat becomes an [aN] stream that is
  // adelay'd into position; the final amix combines them over silence.
  const inputArgs = ["-i", mp4];
  synth.forEach((b) => {
    inputArgs.push("-i", b.aiff);
  });

  const filterChains = synth
    .map(
      (b, i) =>
        `[${i + 1}:a]aresample=48000,adelay=${b.offsetMs}|${b.offsetMs}[a${i}]`,
    )
    .join(";");
  const mixLabels = synth.map((_, i) => `[a${i}]`).join("");
  // Use duration=longest so amix output spans all delayed beats.
  // Then apad + atrim caps the audio at the video's exact duration — this
  // is cleaner than -shortest, which interacted badly with -c:v copy earlier.
  const videoDurSec = videoDurationMs / 1000;
  const filterComplex =
    filterChains +
    `;${mixLabels}amix=inputs=${synth.length}:duration=longest:normalize=0,` +
    `apad,atrim=0:${videoDurSec.toFixed(3)},asetpts=PTS-STARTPTS[aout]`;

  const outMp4 = mp4.replace(/\.mp4$/, "-voiceover.mp4");
  const ffmpegArgs = [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    outMp4,
  ];

  console.log("\n[voiceover] running ffmpeg…");
  execFileSync("ffmpeg", ffmpegArgs, { stdio: ["ignore", "inherit", "inherit"] });

  const finalDurSec = ffprobeDurationSeconds(outMp4);
  console.log(`\n✅ wrote ${outMp4}`);
  console.log(`   duration ${finalDurSec.toFixed(2)}s`);
  if (finalDurSec > 180.0) {
    console.warn(
      `⚠️  OVER 3:00 HARD CAP — trim narration or BEAT_HOLD_MS and re-run.`,
    );
  }
}

try {
  main();
} catch (err) {
  console.error("[voiceover] failed:", err.message ?? err);
  process.exit(1);
}
