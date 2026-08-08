#!/usr/bin/env bash
# Cloud Run domain mapping controller (zero-cost path). Never creates ALB/NEG/forwarding rules.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

die() { echo "ERROR: $*" >&2; exit 1; }
pass() { echo "OK: $*"; }
warn() { echo "WARN: $*" >&2; }

MODE=""
DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --map) MODE=map; shift ;;
    --export-dns) MODE=export; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h)
      cat <<'EOF'
Usage:
  CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config bash domain_map.sh --map [--dry-run]
  CUSTOM_DOMAIN_CONFIG=/path/to/custom-domain.config bash domain_map.sh --export-dns
EOF
      exit 0
      ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ -n "$MODE" ]] || die "choose --map or --export-dns"
[[ -n "${CUSTOM_DOMAIN_CONFIG:-}" ]] || die "set CUSTOM_DOMAIN_CONFIG to the project config file"
[[ -f "$CUSTOM_DOMAIN_CONFIG" ]] || die "config not found: $CUSTOM_DOMAIN_CONFIG"

# shellcheck disable=SC1090
load_config() {
  local key value
  declare -gA CFG=()
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" == *=* ]] || die "malformed config line: $line"
    key="${line%%=*}"
    value="${line#*=}"
    [[ -n "${CFG[$key]+x}" ]] && die "duplicate key: $key"
    CFG["$key"]="$value"
  done < "$CUSTOM_DOMAIN_CONFIG"
  for required in CUSTOM_DOMAIN_PROJECT CUSTOM_DOMAIN_SERVICE CUSTOM_DOMAIN_REGION CUSTOM_DOMAIN_HOSTS; do
    [[ -n "${CFG[$required]:-}" ]] || die "missing $required"
  done
}

load_config
PROJECT="${CFG[CUSTOM_DOMAIN_PROJECT]}"
SERVICE="${CFG[CUSTOM_DOMAIN_SERVICE]}"
REGION="${CFG[CUSTOM_DOMAIN_REGION]}"
IFS=',' read -r -a HOSTS <<< "${CFG[CUSTOM_DOMAIN_HOSTS]}"

command -v gcloud >/dev/null || die "gcloud not found"
GCLOUD=(gcloud --project="$PROJECT")

forbid_alb() {
  warn "policy: ALB/NEG/forwarding-rule domain attach is forbidden (zero-cost). Use Cloud Run domain mapping only."
}

require_domain_token() {
  [[ "$DRY_RUN" -eq 1 ]] && { pass "dry-run: would require typed DOMAIN approval"; return 0; }
  echo "Type DOMAIN to approve Cloud Run domain mapping for project=$PROJECT service=$SERVICE hosts=${CFG[CUSTOM_DOMAIN_HOSTS]}"
  local token
  IFS= read -r token || true
  # strip CR if pasted from Windows
  token="${token//$'\r'/}"
  [[ "$token" == "DOMAIN" ]] || die "approval rejected (expected exact DOMAIN)"
}

map_hosts() {
  forbid_alb
  # Ownership gate before approval prompt (DA-012)
  bash "$SCRIPT_DIR/preflight_ownership.sh" || die "ownership preflight failed"
  require_domain_token
  local host
  for host in "${HOSTS[@]}"; do
    host="$(echo "$host" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$host" ]] || continue
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "DRY-RUN: gcloud beta run domain-mappings create --service=$SERVICE --domain=$host --region=$REGION --project=$PROJECT"
      continue
    fi
    if "${GCLOUD[@]}" beta run domain-mappings describe --domain="$host" --region="$REGION" >/dev/null 2>&1; then
      pass "mapping exists: $host"
    else
      "${GCLOUD[@]}" beta run domain-mappings create \
        --service="$SERVICE" \
        --domain="$host" \
        --region="$REGION"
      pass "mapping created: $host"
    fi
  done
}

export_dns() {
  python3 "$SCRIPT_DIR/export_dns_records.py" \
    --project "$PROJECT" \
    --region "$REGION" \
    --hosts "${CFG[CUSTOM_DOMAIN_HOSTS]}" \
    --registrar "${CFG[CUSTOM_DOMAIN_REGISTRAR]:-other}" \
    --canonical "${CFG[CUSTOM_DOMAIN_CANONICAL]:-}"
}

case "$MODE" in
  map) map_hosts ;;
  export) export_dns ;;
  *) die "internal: bad mode $MODE" ;;
esac
