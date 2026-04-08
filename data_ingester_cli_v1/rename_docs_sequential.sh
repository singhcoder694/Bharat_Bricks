#!/usr/bin/env bash
# Rename all files under a directory to sequential names: START.md, (START+1).md, …
# Default START is 205. Order is locale-sorted by relative path (same idea as the bulk uploader).
#
# Uses a two-phase rename so names never collide with existing files.
#
# Usage:
#   ./rename_docs_sequential.sh [options] <directory>
#
# Options:
#   --start N     first index (default: 205)
#   --dry-run     print planned renames only
#   --no-recurse  only files directly in <directory> (not in subfolders)
#
# Example:
#   ./rename_docs_sequential.sh ./docs
#   ./rename_docs_sequential.sh --start 1 --dry-run ./docs

set -euo pipefail

START=205
DRY_RUN=0
RECURSE=1
TARGET_DIR=""

die() { echo "error: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start)
      START="${2:?}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-recurse)
      RECURSE=0
      shift
      ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      [[ -z "$TARGET_DIR" ]] || die "extra argument: $1"
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

[[ -n "$TARGET_DIR" ]] || die "usage: $0 [--start N] [--dry-run] [--no-recurse] <directory>"
[[ -d "$TARGET_DIR" ]] || die "not a directory: $TARGET_DIR"

[[ "$START" =~ ^[0-9]+$ ]] || die "--start must be a non-negative integer"
(( START >= 0 )) || die "--start must be >= 0"

base="$(cd "$TARGET_DIR" && pwd)"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if (( RECURSE )); then
  (cd "$base" && find . -type f ! -path './.*' ! -name '.___renseq_*' | LC_ALL=C sed 's|^\./||' | LC_ALL=C sort) >"$tmp"
else
  (cd "$base" && find . -maxdepth 1 -type f ! -name '.*' ! -name '.___renseq_*' | LC_ALL=C sed 's|^\./||' | LC_ALL=C sort) >"$tmp"
fi

nfiles=$(wc -l <"$tmp" | tr -d ' ')
(( nfiles > 0 )) || die "no files to rename under $TARGET_DIR"

last=$((START + nfiles - 1))

echo "Renaming $nfiles file(s) in $base"
echo "  → ${START}.md through ${last}.md"
if (( DRY_RUN )); then
  i=0
  while IFS= read -r rel; do
    [[ -z "$rel" ]] && continue
    i=$((i + 1))
    echo "  $rel  →  $((START + i - 1)).md"
  done <"$tmp"
  exit 0
fi

tag=".___renseq_${$}_"
stagings_list="$(mktemp)"
trap 'rm -f "$tmp" "$stagings_list"' EXIT

# Phase 1: move to unique hidden names at tree root (sorted order); flattens subdirs into one sequence.
i=0
while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  f="${base}/${rel}"
  [[ -f "$f" ]] || die "missing: $f"
  i=$((i + 1))
  staging="${base}/${tag}$(printf '%06d' "$i")"
  mv "$f" "$staging"
  printf '%s\n' "$staging" >>"$stagings_list"
done <"$tmp"

# Phase 2: staging → START.md, (START+1).md, … (all in directory root)
i=0
while IFS= read -r staging; do
  [[ -z "$staging" ]] && continue
  [[ -f "$staging" ]] || die "lost staging file: $staging"
  i=$((i + 1))
  dest="${base}/$((START + i - 1)).md"
  mv "$staging" "$dest"
done <"$stagings_list"

rm -f "$tmp" "$stagings_list"
trap - EXIT

echo "Done. Last file: ${last}.md (count = $nfiles)"
