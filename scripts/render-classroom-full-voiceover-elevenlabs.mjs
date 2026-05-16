#!/usr/bin/env node
/**
 * Generate the final "The Classroom Is Already Full" voiceover with ElevenLabs.
 *
 * Required:
 *   ELEVENLABS_API_KEY
 *
 * Optional:
 *   ELEVENLABS_VOICE_ID
 *   ELEVENLABS_MODEL_ID      default: eleven_multilingual_v2
 *   ELEVENLABS_OUTPUT_FORMAT default: mp3_44100_128
 */

import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "apps", "marketing-video", "public", "audio", "the-classroom-is-already-full-2026-05-16");
const OUT_FILE = path.join(OUT_DIR, "voiceover.mp3");
const MANIFEST_FILE = path.join(OUT_DIR, "manifest.json");

const VOICEOVER_TEXT = `At 8:12 in the morning, a classroom can already be full.

Not just full of students.

Full of reading levels. Home languages. Behaviour plans. Sensory needs. Missed sleep. New math outcomes. A substitute note. A family message. An educational assistant who is here for the morning, but not the afternoon.

Across Alberta, this is no longer the exception. It is the operating reality.

The crisis is not that teachers care too little. It is that the coordination load has become too large for one human brain to carry alone.

PrairieClassroom OS was built for that moment.

Not as a student chatbot. Not as another screen for children. As an operating layer for the adults holding the classroom together.

Here is Mrs. Okafor's synthetic Grade 3/4 classroom.

She starts the day in Today view: what changed, who needs attention, where the morning could break down.

A worksheet comes in as a photo. Gemma four reads the artifact, extracts the structure, and helps turn one resource into readiness-aligned variants.

A quick observation becomes classroom memory.

That memory feeds tomorrow's plan.

Tomorrow's plan becomes an EA briefing.

The briefing becomes action.

And the action becomes the next signal.

This is the loop: classroom signal, Gemma four synthesis, teacher judgment, classroom memory.

Under the hood, PrairieClassroom OS routes work across two Gemma four lanes: a fast live tier for classroom transformations, and a planning tier for deeper synthesis across records.

It can use bounded tools for curriculum lookup and intervention history. It checks the roster before retrieving student records. It drafts family messages, but it never sends them. The teacher stays in control.

That matters, because education AI should not diagnose, surveil, or replace professional judgment.

It should make the invisible work visible.

It should give teachers time back for the human parts of teaching: noticing, explaining, encouraging, adapting, deciding.

PrairieClassroom OS is a working prototype built on synthetic Alberta classroom data.

But the problem is real.

Inclusive classrooms need more than another chatbot.

They need memory. Coordination. Safety. And intelligence close enough to the classroom to be useful.

That is what Gemma four makes possible.

PrairieClassroom OS: a classroom operating layer for the future of inclusive education.`;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Set it as an environment variable; do not store it in the repo.`);
  }
  return value;
}

function scoreVoice(voice) {
  const haystack = [
    voice.name,
    voice.category,
    ...Object.values(voice.labels ?? {}),
    voice.description,
    voice.preview_url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const token of ["documentary", "narration", "narrator", "calm", "warm", "grounded", "professional", "clear"]) {
    if (haystack.includes(token)) score += 6;
  }
  for (const name of ["jessica", "rachel", "laura", "sarah", "matilda", "dorothy", "nicole"]) {
    if (haystack.includes(name)) score += 4;
  }
  for (const penalty of ["trailer", "hype", "shout", "advert", "radio", "dramatic", "villain"]) {
    if (haystack.includes(penalty)) score -= 8;
  }
  return score;
}

async function fetchJson(url, apiKey) {
  const response = await fetch(url, { headers: { "xi-api-key": apiKey } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs request failed with ${response.status}: ${detail.slice(0, 800)}`);
  }
  return response.json();
}

async function chooseVoice(apiKey) {
  const requested = process.env.ELEVENLABS_VOICE_ID?.trim();
  const voices = await fetchJson("https://api.elevenlabs.io/v1/voices", apiKey);
  const list = Array.isArray(voices.voices) ? voices.voices : [];
  if (!list.length) throw new Error("No ElevenLabs voices were available for this account.");

  if (requested) {
    const voice = list.find((candidate) => candidate.voice_id === requested);
    return voice ?? { voice_id: requested, name: "provided voice id", labels: {} };
  }

  return [...list].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

async function renderVoiceover({ apiKey, voiceId, modelId, outputFormat }) {
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
      text: VOICEOVER_TEXT,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.78,
        style: 0.22,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed with ${response.status}: ${detail.slice(0, 1000)}`);
  }

  await writeFile(OUT_FILE, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128";
  const voice = await chooseVoice(apiKey);

  await mkdir(OUT_DIR, { recursive: true });
  await renderVoiceover({ apiKey, voiceId: voice.voice_id, modelId, outputFormat });

  const manifest = {
    generatedAt: new Date().toISOString(),
    modelId,
    outputFormat,
    voice: {
      voiceId: voice.voice_id,
      name: voice.name,
      labels: voice.labels ?? {},
    },
    textCharacters: VOICEOVER_TEXT.length,
    files: {
      voiceover: path.relative(ROOT, OUT_FILE),
    },
  };
  await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Wrote ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
