#!/bin/sh

set -eu

STREAM_KEY="${1:-default}"
HLS_ROOT="/data/hls"
TARGET_DIR="${HLS_ROOT}/${STREAM_KEY}"
LOG_FILE="/tmp/ffmpeg-${STREAM_KEY}.log"
FFMPEG_BIN="/usr/local/bin/ffmpeg"

mkdir -p "${TARGET_DIR}"

{
  echo "[$(date -Is)] start stream ${STREAM_KEY}"

  attempt=1
  max_attempts=5

  while [ "${attempt}" -le "${max_attempts}" ]; do
    echo "[$(date -Is)] ffmpeg attempt ${attempt}/${max_attempts}"

    if "${FFMPEG_BIN}" \
      -y \
      -loglevel info \
      -i "rtmp://localhost:1935/live/${STREAM_KEY}" \
      -rtmp_live live \
      -reconnect 1 \
      -reconnect_streamed 1 \
      -reconnect_delay_max 2 \
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
    then
      echo "[$(date -Is)] ffmpeg completed successfully"
      exit 0
    else
      exit_code=$?
      echo "[$(date -Is)] ffmpeg exited with code ${exit_code}"
    fi

    attempt=$((attempt + 1))
    if [ "${attempt}" -le "${max_attempts}" ]; then
      sleep 3
    fi
  done

  echo "[$(date -Is)] ffmpeg failed after ${max_attempts} attempts"
  exit 1
} >>"${LOG_FILE}" 2>&1
