#!/usr/bin/env node
/**
 * Verify the submission video container and refresh a contact sheet for visual review.
 */

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_INPUT = "qa/demo-script/videos/prairieclassroom-submission-final-2026-05-11.mp4";
const input = path.resolve(ROOT, process.argv[2] || DEFAULT_INPUT);
const contactSheet = input.replace(/\.mp4$/i, "-contact-sheet.jpg");
const sceneMidFrames = [180, 570, 1005, 1470, 1980, 2490, 2970, 3405];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseRate(rate) {
  const [num, den] = rate.split("/").map(Number);
  return den ? num / den : num;
}

async function readProbe() {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,bit_rate",
    "-show_streams",
    "-of",
    "json",
    input,
  ]);
  return JSON.parse(stdout);
}

async function writeContactSheet() {
  await mkdir(path.dirname(contactSheet), { recursive: true });
  const select = sceneMidFrames.map((frame) => `eq(n\\,${frame})`).join("+");
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    `select=${select},scale=480:-1,tile=4x2`,
    "-frames:v",
    "1",
    contactSheet,
  ]);
}

async function main() {
  const probe = await readProbe();
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(probe.format.duration);
  const fps = parseRate(video?.avg_frame_rate || "0/1");

  assert(video, "Missing video stream");
  assert(audio, "Missing audio stream");
  assert(video.width === 1920 && video.height === 1080, `Expected 1920x1080, got ${video.width}x${video.height}`);
  assert(Math.abs(fps - 30) < 0.01, `Expected 30fps, got ${fps}`);
  assert(duration >= 119.8 && duration <= 120.3, `Expected about 120s, got ${duration.toFixed(3)}s`);
  assert(video.codec_name === "h264", `Expected h264 video, got ${video.codec_name}`);
  assert(audio.codec_name === "aac", `Expected aac audio, got ${audio.codec_name}`);

  await writeContactSheet();

  console.log(`OK ${path.relative(ROOT, input)}`);
  console.log(`duration=${duration.toFixed(3)}s fps=${fps.toFixed(2)} size=${video.width}x${video.height}`);
  console.log(`contact_sheet=${path.relative(ROOT, contactSheet)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
