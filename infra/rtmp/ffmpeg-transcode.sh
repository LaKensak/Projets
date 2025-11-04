#!/usr/bin/env bash

set -euo pipefail

STREAM_KEY="${1:-default}"
HLS_ROOT="/data/hls"
TARGET_DIR="${HLS_ROOT}/${STREAM_KEY}"

mkdir -p "${TARGET_DIR}"

ffmpeg \
  -y \
  -i "rtmp://localhost/live/${STREAM_KEY}" \
  -c:v libx264 \
  -preset veryfast \
  -tune zerolatency \
  -profile:v baseline \
  -level 3.1 \
  -b:v 2500k \
  -maxrate 3000k \
  -bufsize 5000k \
  -g 60 \
  -keyint_min 60 \
  -sc_threshold 0 \
  -c:a aac \
  -ac 2 \
  -ar 48000 \
  -b:a 128k \
  -f hls \
  -hls_time 2 \
  -hls_list_size 6 \
  -hls_flags delete_segments+program_date_time \
  -hls_segment_filename "${TARGET_DIR}/${STREAM_KEY}_%03d.ts" \
  "${TARGET_DIR}/index.m3u8"
