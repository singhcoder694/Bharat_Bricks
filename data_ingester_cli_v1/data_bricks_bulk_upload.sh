#!/usr/bin/env bash
# RAG knowledge base ingestion: Unity Catalog volume upload via Databricks CLI.
#
# Install the Databricks CLI (v0.205+ required) per official docs:
#   https://docs.databricks.com/aws/en/dev-tools/cli/install
# Examples from that page:
#   macOS/Linux (Homebrew):  brew tap databricks/tap && brew install databricks
#   macOS/Linux (curl):      curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh
#   Windows:                 winget install Databricks.DatabricksCLI
# Then configure auth:       https://docs.databricks.com/aws/en/dev-tools/cli/authentication
#
# Prerequisites: CLI v0.205+, auth configured, DATABRICKS_SQL_WAREHOUSE_ID for UC SQL.
#
# Usage:
#   export DATABRICKS_SQL_WAREHOUSE_ID="<warehouse-id>"
#   ./upload_docs.sh [path-to-docs-dir]
#
# Optional env:
#   DATABRICKS_PROFILE   — CLI profile (default: DEFAULT)
#   UC_CATALOG           — catalog name (default: main)
#   UC_SCHEMA            — schema name (default: rag); e.g. docs → main.docs.<volume>
#   UC_VOLUME            — volume name (default: documents)
#   INGEST_NO_PROGRESS   — set to 1 for plain logs (no bars); upload prints sparse checkpoints only
#
# Unity Catalog DDL uses CREATE … IF NOT EXISTS everywhere: re-running is safe; existing
# catalog/schema/volume are left as-is (nothing recreated from scratch).
#
# Upload preserves relative paths and filenames under the volume (e.g. subdir/a.md → …/subdir/a.md).
#
# Troubleshooting: If `current-user me` works but SQL API fails with
# "cannot configure default credentials", see normalize_databricks_auth_env below.

set -euo pipefail

DOCS_DIR="${1:-./docs}"

UC_CATALOG="${UC_CATALOG:-main}"
UC_SCHEMA="${UC_SCHEMA:-rag}"
UC_VOLUME="${UC_VOLUME:-documents}"

# Global CLI flags must appear immediately after `databricks` (e.g. databricks --profile prod fs ls).
DB_CLI=(databricks)
if [[ -n "${DATABRICKS_PROFILE:-}" ]]; then
  DB_CLI=(databricks --profile "$DATABRICKS_PROFILE")
fi

# CLI requires dbfs:/ prefix; bare /Volumes/... is treated as local disk (macOS: /Volumes is mounts).
VOLUME_PATH="dbfs:/Volumes/${UC_CATALOG}/${UC_SCHEMA}/${UC_VOLUME}"

PHASE=0
TOTAL_PHASES=8

die() {
  echo "error: $*" >&2
  exit 1
}

# Simple Unity Catalog identifier check (catalog.schema.volume); extend pattern if your names need more.
validate_uc_name() {
  local n="$1" kind="$2"
  [[ "$n" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || die "invalid $kind: '$n' (use letters, digits, underscore; start with letter or _)"
}

bump_phase() {
  local label="$1"
  PHASE=$((PHASE + 1))
  if [[ -n "${INGEST_NO_PROGRESS:-}" ]] || [[ ! -t 1 ]]; then
    echo "[$PHASE/$TOTAL_PHASES] $label"
    return
  fi
  local w=32 filled pct
  pct=$(( (100 * PHASE + TOTAL_PHASES / 2) / TOTAL_PHASES ))
  filled=$(( PHASE * w / TOTAL_PHASES ))
  (( filled > w )) && filled=$w
  printf '\r\033[K['
  local i
  for ((i = 0; i < filled; i++)); do printf '█'; done
  for ((i = filled; i < w; i++)); do printf '░'; done
  printf '] %3d%%  %s\n' "$pct" "$label"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

# Align env with unified authentication (CLI + `databricks api` / Go SDK).
# See https://docs.databricks.com/aws/en/dev-tools/auth/env-vars
normalize_databricks_auth_env() {
  # If DATABRICKS_TOKEN is unset or empty, ensure it is unset (not empty-string
  # set), or the Go SDK skips OAuth in ~/.databrickscfg.
  if [[ -z "${DATABRICKS_TOKEN:-}" ]]; then
    unset DATABRICKS_TOKEN 2>/dev/null || true
  fi
  # Go SDK reads DATABRICKS_CONFIG_PROFILE; keep it in sync when using --profile.
  if [[ -n "${DATABRICKS_PROFILE:-}" ]]; then
    export DATABRICKS_CONFIG_PROFILE="$DATABRICKS_PROFILE"
  fi
}

check_cli() {
  bump_phase "Check CLI"
  need_cmd databricks
  need_cmd python3
  local ver
  ver="$("${DB_CLI[@]}" version 2>/dev/null | head -1 || true)"
  if [[ -z "$ver" ]]; then
    die "could not read Databricks CLI version; install CLI v0.205+ — https://docs.databricks.com/aws/en/dev-tools/cli/install"
  fi
  echo "       $ver"
}

check_auth() {
  bump_phase "Authenticate"
  if ! "${DB_CLI[@]}" current-user me >/dev/null 2>&1; then
    die "Databricks authentication failed. Run: databricks auth login   or   databricks configure --token"
  fi
  echo "       $("${DB_CLI[@]}" current-user me 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('userName','user'))" 2>/dev/null || echo connected)"
}

require_warehouse() {
  bump_phase "SQL warehouse ID"
  [[ -n "${DATABRICKS_SQL_WAREHOUSE_ID:-}" ]] || die "set DATABRICKS_SQL_WAREHOUSE_ID to a running SQL warehouse ID (SQL Editor → warehouse details, or databricks warehouses list)"
  echo "       warehouse ${DATABRICKS_SQL_WAREHOUSE_ID}"
}

# Executes SQL on a SQL warehouse via Statement Execution API 2.0.
# Note: Open-source Databricks CLI does not ship `databricks sql statement execute`; this is the supported equivalent.
run_sql() {
  local statement="$1"
  export _INGEST_SQL_STATEMENT="$statement"
  local json_payload
  json_payload="$(python3 <<'PY'
import json, os
print(json.dumps({
    "warehouse_id": os.environ["DATABRICKS_SQL_WAREHOUSE_ID"],
    "statement": os.environ["_INGEST_SQL_STATEMENT"],
    "wait_timeout": "50s",  # API max is 50s (or 0 = no wait); see Statement Execution API
    "on_wait_timeout": "CANCEL",
    "disposition": "INLINE",
    "format": "JSON_ARRAY",
}))
PY
)"
  local out
  if ! out="$("${DB_CLI[@]}" api post /api/2.0/sql/statements --json "$json_payload" 2>&1)"; then
    if [[ "$out" == *"cannot configure default credentials"* ]]; then
      die "SQL API request failed: $out

Try:
  1) env | grep DATABRICKS  — if DATABRICKS_TOKEN is empty, run: unset DATABRICKS_TOKEN
  2) Re-login: databricks auth login --host <workspace-url>
  3) If it still fails: rm -f ~/.databricks/token-cache.json  then auth login again (corrupt OAuth cache)
  4) Scripting fallback: PAT + export DATABRICKS_HOST and DATABRICKS_TOKEN (see https://docs.databricks.com/aws/en/dev-tools/auth/pat )
  Docs: https://docs.databricks.com/aws/en/dev-tools/auth/unified-auth"
    fi
    die "SQL API request failed: $out"
  fi
  unset _INGEST_SQL_STATEMENT
  local state
  state="$(printf '%s' "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',{}).get('state','UNKNOWN'))" 2>/dev/null || echo UNKNOWN)"
  if [[ "$state" != "SUCCEEDED" ]]; then
    die "SQL did not succeed (state=$state). Response: $out"
  fi
}

ensure_uc_assets() {
  echo "Target Unity Catalog: ${UC_CATALOG}.${UC_SCHEMA}.${UC_VOLUME} (CREATE … IF NOT EXISTS — skips if already there)"
  bump_phase "Catalog (IF NOT EXISTS)"
  run_sql "CREATE CATALOG IF NOT EXISTS ${UC_CATALOG};"
  echo "       catalog ${UC_CATALOG}"
  bump_phase "Schema (IF NOT EXISTS)"
  run_sql "CREATE SCHEMA IF NOT EXISTS ${UC_CATALOG}.${UC_SCHEMA};"
  echo "       ${UC_CATALOG}.${UC_SCHEMA}"
  bump_phase "Volume (IF NOT EXISTS)"
  run_sql "CREATE VOLUME IF NOT EXISTS ${UC_CATALOG}.${UC_SCHEMA}.${UC_VOLUME};"
  echo "       ${UC_CATALOG}.${UC_SCHEMA}.${UC_VOLUME}"
}

# Create UC volume subdirs for a relative path like a/b/file.md (mkdir each prefix).
ensure_volume_parent_for_rel() {
  local rel="$1" parent acc="" p oifs
  parent="$(dirname "$rel")"
  [[ "$parent" == "." ]] && return 0
  oifs="$IFS"
  IFS='/'
  for p in $parent; do
    [[ -z "$p" ]] && continue
    acc="${acc:+$acc/}$p"
    IFS="$oifs"
    "${DB_CLI[@]}" fs mkdir "${VOLUME_PATH}/${acc}" 2>/dev/null || true
    IFS='/'
  done
  IFS="$oifs"
}

# One-line upload progress (avoids recursive `fs cp`, which logs every path on many CLI versions).
upload_file_bar() {
  local cur="$1" total="$2" width="${3:-28}"
  local filled pct
  pct=$(( (100 * cur + total / 2) / total ))
  filled=$(( cur * width / total ))
  (( filled > width )) && filled=$width
  printf '\r\033[K['
  local j
  for ((j = 0; j < filled; j++)); do printf '█'; done
  for ((j = filled; j < width; j++)); do printf '░'; done
  printf '] %d/%d (%d%%) uploading…' "$cur" "$total" "$pct"
}

upload_docs() {
  [[ -d "$DOCS_DIR" ]] || die "docs directory not found: $DOCS_DIR"
  local base tmp nfiles i f rel err use_bar
  base="$(cd "$DOCS_DIR" && pwd)"
  tmp="$(mktemp)"
  find "$base" -type f -print0 >"$tmp"
  nfiles=$(tr -cd '\0' <"$tmp" | wc -c | tr -d ' ')
  if (( nfiles < 1 )); then
    rm -f "$tmp"
    die "no files under $DOCS_DIR"
  fi

  bump_phase "Upload ($nfiles files)"
  echo "       $base → $VOLUME_PATH/ (paths preserved)"

  i=0
  use_bar=""
  [[ -t 1 ]] && [[ -z "${INGEST_NO_PROGRESS:-}" ]] && use_bar=1

  while IFS= read -r -d '' f; do
    i=$((i + 1))
    rel="${f#"${base}/"}"
    ensure_volume_parent_for_rel "$rel"
    if [[ -n "$use_bar" ]]; then
      upload_file_bar "$i" "$nfiles"
    elif (( i == 1 || i == nfiles || i % 25 == 0 )); then
      echo "       upload $i / $nfiles"
    fi
    if ! err="$("${DB_CLI[@]}" fs cp "$f" "${VOLUME_PATH}/${rel}" --overwrite 2>&1)"; then
      [[ -n "$use_bar" ]] && printf '\n'
      rm -f "$tmp"
      die "upload failed: $rel — $err"
    fi
  done <"$tmp"
  rm -f "$tmp"
  [[ -n "$use_bar" ]] && printf '\n'
  echo "       uploaded $nfiles file(s)"
}

verify_upload() {
  bump_phase "Verify listing"
  "${DB_CLI[@]}" fs ls "$VOLUME_PATH/"
}

main() {
  validate_uc_name "$UC_CATALOG" UC_CATALOG
  validate_uc_name "$UC_SCHEMA" UC_SCHEMA
  validate_uc_name "$UC_VOLUME" UC_VOLUME
  normalize_databricks_auth_env
  check_cli
  check_auth
  require_warehouse
  ensure_uc_assets
  upload_docs
  verify_upload
  echo "Done. Notebooks path: /Volumes/${UC_CATALOG}/${UC_SCHEMA}/${UC_VOLUME}/  |  CLI: ${VOLUME_PATH}/"
}

main "$@"
