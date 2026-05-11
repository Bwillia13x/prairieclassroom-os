#!/usr/bin/env node
/**
 * Add an ElevenLabs voiceover to a timed walkthrough recording.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node scripts/add-elevenlabs-walkthrough-voiceover.mjs path/to/walkthrough.mp4
 *
 * Optional:
 *   ELEVENLABS_VOICE_ID
 *   ELEVENLABS_VOICE_NAME       default: Bella, Jessica, Rachel, Aria, Sarah
 *   ELEVENLABS_MODEL_ID         default: eleven_multilingual_v2
 *   ELEVENLABS_OUTPUT_FORMAT    default: mp3_44100_128
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import path from "node:path";

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";
const DEFAULT_VOICE_NAMES = ["Bella", "Jessica", "Rachel", "Aria", "Sarah"];

const NARRATIONS = [
  {
    key: "01-today",
    mark: "todayHero",
    text:
      "A teacher opens PrairieClassroom in the demo Grade three-four room. The day starts with priorities, not another blank dashboard.",
  },
  {
    key: "02-day-arc",
    mark: "todayDayArc",
    text:
      "The morning view shows where the classroom will get tight, and who needs the first adult move.",
  },
  {
    key: "03-debt",
    mark: "todayDebt",
    text:
      "Complexity debt keeps follow-ups, recurring plans, and unresolved patterns visible until the next action is clear.",
  },
  {
    key: "04-differentiate",
    mark: "differentiateNav",
    text:
      "Now she prepares tomorrow's lesson. One worksheet is pasted in, with a real goal: keep the fractions outcome, but scaffold the language load.",
  },
  {
    key: "05-variants",
    mark: "differentiateGenerated",
    text:
      "The result is not four random worksheets. It is one learning target, expressed as core, chunked, extension, and E A L supported lanes.",
  },
  {
    key: "06-family-setup",
    mark: "familyMessageNav",
    text:
      "Next, the teacher drafts a family update. The system can help with plain language and home-language context, but the teacher stays in control.",
  },
  {
    key: "07-family-safety",
    mark: "familyMessageGenerated",
    text:
      "The message is staged for review. It is editable, approval-gated, and never sent automatically.",
  },
  {
    key: "08-adults",
    mark: "eaBriefingNav",
    text:
      "The operations lane turns classroom memory into adult coordination. The E A briefing and load profile make the plan realistic for the people in the room.",
  },
  {
    key: "09-forecast",
    mark: "forecastNav",
    text:
      "The forecast looks ahead before the pressure point arrives, separating stable blocks from moments that need planning now.",
  },
  {
    key: "10-close",
    mark: "closeLightThemeNav",
    text:
      "Across desktop and mobile, PrairieClassroom treats inclusive classroom complexity as coordination work, with teacher judgment still at the center.",
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function ffprobeDurationSeconds(file) {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      file,
    ],
    { encoding: "utf8" },
  ).trim();
  return Number.parseFloat(out);
}

function findManifest(mp4) {
  const stem = mp4.replace(/\.mp4$/, "");
  const candidates = [`${stem}.timing.json`, `${stem}.webm.timing.json`];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`No timing manifest found next to ${mp4}`);
  return found;
}

async function selectVoice(apiKey) {
  const explicitVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (explicitVoiceId) {
    return {
      voice_id: explicitVoiceId,
      name: process.env.ELEVENLABS_VOICE_NAME?.trim() || "explicit voice",
    };
  }

  const wantedNames = (process.env.ELEVENLABS_VOICE_NAME?.trim()
    ? [process.env.ELEVENLABS_VOICE_NAME.trim()]
    : DEFAULT_VOICE_NAMES
  ).map((name) => name.toLowerCase());

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs voice lookup failed with ${response.status}: ${detail.slice(0, 500)}`);
  }
  const data = await response.json();
  const voices = Array.isArray(data.voices) ? data.voices : [];
  const voice =
    voices.find((candidate) =>
      wantedNames.some((name) => candidate.name?.toLowerCase().includes(name)),
    ) ?? voices[0];
  if (!voice?.voice_id) throw new Error("ElevenLabs returned no usable voices.");
  return voice;
}

async function renderClip({ apiKey, voice, modelId, outputFormat, narration, outDir }) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}`);
  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: narration.text,
      model_id: modelId,
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.78,
        style: 0.16,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed for ${narration.key} with ${response.status}: ${detail.slice(0, 1000)}`);
  }

  const file = path.join(outDir, `${narration.key}.mp3`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

function muxVoiceover({ mp4, clips, outMp4, videoDurationMs }) {
  const inputArgs = ["-i", mp4];
  for (const clip of clips) inputArgs.push("-i", clip.file);

  const filterChains = clips
    .map(
      (clip, index) =>
        `[${index + 1}:a]aresample=48000,adelay=${clip.offsetMs}|${clip.offsetMs}[a${index}]`,
    )
    .join(";");
  const mixLabels = clips.map((_, index) => `[a${index}]`).join("");
  const videoDurSec = videoDurationMs / 1000;
  const filterComplex =
    `${filterChains};${mixLabels}amix=inputs=${clips.length}:duration=longest:normalize=0,` +
    `apad,atrim=0:${videoDurSec.toFixed(3)},asetpts=PTS-STARTPTS,` +
    "loudnorm=I=-16:LRA=11:TP=-1.0[aout]";

  execFileSync(
    "ffmpeg",
    [
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
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
}

async function main() {
  const mp4 = process.argv[2];
  if (!mp4 || !mp4.endsWith(".mp4") || !existsSync(mp4)) {
    throw new Error("usage: node scripts/add-elevenlabs-walkthrough-voiceover.mjs path/to/walkthrough.mp4");
  }

  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_OUTPUT_FORMAT;
  const manifestPath = findManifest(mp4);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const markMap = new Map(manifest.beats.map((beat) => [beat.beat, beat.offsetMs]));
  const videoDurationMs = markMap.get("end") ?? Math.round(ffprobeDurationSeconds(mp4) * 1000);
  const voice = await selectVoice(apiKey);

  const audioDir = path.join(
    path.dirname(mp4),
    "elevenlabs-walkthrough-clips",
    path.basename(mp4, ".mp4"),
  );
  mkdirSync(audioDir, { recursive: true });

  console.log(`[elevenlabs] video    : ${mp4}`);
  console.log(`[elevenlabs] manifest : ${manifestPath}`);
  console.log(`[elevenlabs] voice    : ${voice.name}`);
  console.log(`[elevenlabs] model    : ${modelId}`);

  const resolved = NARRATIONS.map((narration) => {
    const offsetMs = markMap.get(narration.mark);
    if (offsetMs == null) throw new Error(`Timing manifest missing mark ${narration.mark}`);
    return { ...narration, offsetMs };
  });

  const clips = [];
  for (let i = 0; i < resolved.length; i += 1) {
    const narration = resolved[i];
    const file = await renderClip({
      apiKey,
      voice,
      modelId,
      outputFormat,
      narration,
      outDir: audioDir,
    });
    const durationSec = ffprobeDurationSeconds(file);
    const nextOffsetMs = i + 1 < resolved.length ? resolved[i + 1].offsetMs : videoDurationMs;
    const slotSec = (nextOffsetMs - narration.offsetMs) / 1000;
    const headroomSec = slotSec - durationSec;
    console.log(
      `  ${headroomSec >= 0 ? "OK" : "OVER"} ${narration.key.padEnd(18)} ` +
        `start ${(narration.offsetMs / 1000).toFixed(2).padStart(6)}s ` +
        `clip ${durationSec.toFixed(2).padStart(5)}s / slot ${slotSec.toFixed(2).padStart(5)}s ` +
        `headroom ${headroomSec.toFixed(2)}s`,
    );
    if (headroomSec < -0.25) {
      throw new Error(`${narration.key} voiceover exceeds its slot. Shorten the narration and rerun.`);
    }
    clips.push({ ...narration, file, durationSec });
  }

  const clipManifest = {
    generatedAt: new Date().toISOString(),
    sourceVideo: mp4,
    sourceTimingManifest: manifestPath,
    voiceName: voice.name,
    voiceId: voice.voice_id,
    modelId,
    outputFormat,
    clips: clips.map((clip) => ({
      key: clip.key,
      mark: clip.mark,
      offsetMs: clip.offsetMs,
      durationSec: clip.durationSec,
      text: clip.text,
      file: path.relative(path.dirname(mp4), clip.file),
    })),
  };
  writeFileSync(path.join(audioDir, "manifest.json"), `${JSON.stringify(clipManifest, null, 2)}\n`);

  const outMp4 = mp4.replace(/\.mp4$/, "-elevenlabs-voiceover.mp4");
  muxVoiceover({ mp4, clips, outMp4, videoDurationMs });

  console.log(`\n[elevenlabs] wrote ${outMp4}`);
  console.log(`[elevenlabs] duration ${ffprobeDurationSeconds(outMp4).toFixed(2)}s`);
  console.log(`[elevenlabs] clips    ${audioDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
