#!/usr/bin/env bash
# Fail fast if apex is not verified for the active Google account (DA-012).
set -euo pipefail

die() { echo "ERROR: $*" >&2; exit 1; }
pass() { echo "OK: $*"; }

[[ -n "${CUSTOM_DOMAIN_CONFIG:-}" ]] || die "set CUSTOM_DOMAIN_CONFIG"
[[ -f "$CUSTOM_DOMAIN_CONFIG" ]] || die "config not found: $CUSTOM_DOMAIN_CONFIG"

apex=""
project=""
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line//[[:space:]]/}" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  case "$key" in
    CUSTOM_DOMAIN_PROJECT) project="$value" ;;
    CUSTOM_DOMAIN_HOSTS)
      IFS=',' read -r -a hosts <<< "$value"
      for h in "${hosts[@]}"; do
        h="$(echo "$h" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        h="${h#www.}"
        apex="$h"
        break
      done
      ;;
  esac
done < "$CUSTOM_DOMAIN_CONFIG"

[[ -n "$project" && -n "$apex" ]] || die "need CUSTOM_DOMAIN_PROJECT and CUSTOM_DOMAIN_HOSTS"

verified="$(gcloud domains list-user-verified --project="$project" --format='value(id)' 2>/dev/null || true)"
if echo "$verified" | grep -Fxq "$apex"; then
  pass "domain ownership verified: $apex"
  exit 0
fi

cat >&2 <<EOF
ERROR: '$apex' is not verified for this Google account (DA-012).

Do this once (UI paste — safest):
  1) Open: https://search.google.com/search-console/welcome
  2) Add property → Domain → enter $apex
  3) Copy the Google TXT record
  4) At your registrar (e.g. Spaceship) for $apex: Add TXT, Host=@, Value=<token>
  5) Click Verify in Search Console
  6) Re-run: bash scripts/custom_domain/preflight_ownership.sh

Then continue: domain_map.sh --map → --export-dns → paste mapping records → HTTPS.
EOF
exit 2
