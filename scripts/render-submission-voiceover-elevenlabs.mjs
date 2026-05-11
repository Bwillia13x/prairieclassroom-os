#!/usr/bin/env node
/**
 * Generate scene-aligned PrairieClassroom submission-cut voiceover clips with ElevenLabs.
 *
 * Required:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_VOICE_ID
 *
 * Optional:
 *   ELEVENLABS_MODEL_ID      default: eleven_multilingual_v2
 *   ELEVENLABS_OUTPUT_FORMAT default: mp3_44100_128
 *
 * Output:
 *   apps/marketing-video/public/audio/submission-2026-05-11/scene-01.mp3
 *   apps/marketing-video/public/audio/submission-2026-05-11/manifest.json
 */

import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(
  ROOT,
  "apps",
  "marketing-video",
  "public",
  "audio",
  "submission-2026-05-11",
);

const SCENES = [
  {
    id: "scene-01",
    seconds: 12,
    text: "This is the opening proof: a paper worksheet becomes five usable access routes without the teacher retyping the artifact.",
  },
  {
    id: "scene-02",
    seconds: 14,
    text: "The real problem is coordination. In a synthetic Grade 3/4 room, the day includes language supports, sensory routines, family follow-up, and a morning-only educational assistant.",
  },
  {
    id: "scene-03",
    seconds: 15,
    text: "PrairieClassroom OS organizes that work around four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families.",
  },
  {
    id: "scene-04",
    seconds: 16,
    text: "Gemma 4 matters because the workflow can read the classroom artifact, transform it quickly, and keep the learning goal intact across different supports.",
  },
  {
    id: "scene-05",
    seconds: 18,
    text: "A quick teacher note becomes structured memory. That memory feeds tomorrow's plan, the EA briefing, the next family message, and the following pattern review.",
  },
  {
    id: "scene-06",
    seconds: 16,
    text: "Safety is practical here. The system can draft a family message, but it cannot send one. The teacher reviews, edits, and approves before anything leaves the classroom.",
  },
  {
    id: "scene-07",
    seconds: 16,
    text: "The proof lane stays honest: proof and claims checks pass, hosted Gemma proof is synthetic-demo only, and the privacy-first local deployment path is separate until the Ollama host is proven.",
  },
  {
    id: "scene-08",
    seconds: 13,
    text: "PrairieClassroom OS is built for the adults carrying inclusive classrooms: less coordination drag, more timely support, and professional judgment still in control.",
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Set it in your shell; do not paste it into chat.`);
  }
  return value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function renderClip({ apiKey, voiceId, modelId, outputFormat, scene }) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: scene.text,
      model_id: modelId,
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed for ${scene.id} with ${response.status}: ${detail.slice(0, 1000)}`);
  }

  const outPath = path.join(OUT_DIR, `${scene.id}.mp3`);
  await writeFile(outPath, Buffer.from(await response.arrayBuffer()));
  return outPath;
}

async function main() {
  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const voiceId = requireEnv("ELEVENLABS_VOICE_ID");
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128";

  await mkdir(OUT_DIR, { recursive: true });

  const clips = [];
  for (const scene of SCENES) {
    const outPath = await renderClip({ apiKey, voiceId, modelId, outputFormat, scene });
    clips.push({
      id: scene.id,
      seconds: scene.seconds,
      text: scene.text,
      file: path.relative(ROOT, outPath),
    });
    console.log(`Wrote ${path.relative(ROOT, outPath)}`);
    await sleep(350);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    modelId,
    outputFormat,
    voiceId,
    clips,
    renderCommand: "npm run video:render:submission:voiceover",
  };
  const manifestPath = path.join(OUT_DIR, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, manifestPath)}`);
  console.log("Render with: npm run video:render:submission:voiceover");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
