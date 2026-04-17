#!/usr/bin/env bash
# Convert a Playwright webm walkthrough to YouTube-friendly mp4 (h264 + aac).
#
# Usage:
#   bash scripts/convert-demo-video.sh qa/demo-script/videos/walkthrough-<stamp>.webm
#
# Output:
#   Same directory, same basename, .mp4 extension.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <path/to/input.webm>" >&2
  exit 1
fi

INPUT="$1"
if [[ ! -f "$INPUT" ]]; then
  echo "error: input not found: $INPUT" >&2
  exit 1
fi

OUTPUT="${INPUT%.webm}.mp4"

# YouTube recommended: h264 high profile, yuv420p, AAC stereo, +faststart
# -preset slow trades encode time for smaller file + better quality.
# No audio track in source; we add silence so YouTube accepts it cleanly.
ffmpeg -y \
  -i "$INPUT" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 20 \
  -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 48000 \
  -movflags +faststart \
  -shortest \
  "$OUTPUT"

echo
echo "✅ wrote $OUTPUT"
echo
echo "Duration / size:"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUTPUT"
