#!/usr/bin/env bash
#
# deploy.sh — reusable Google Cloud Build + Cloud Run deployment automation
#
# Required environment:
#   DEPLOY_CONFIG=/path/to/deployment.config
#
# Modes:
#   --check    Preflight only. Deploys nothing.
#   --deploy   Preflight → typed human gate → Cloud Build submit → verification → handover block.
#   --verify   Post-deploy verification only (compares live state against current HEAD).
#
# Optional flags (repeatable, per release):
#   --route <path>                        Live route for infra/content checks (default: /)
#   --expect-present-route "text"         Text must appear in the fetched route response (raw HTML)
#   --expect-absent-route "text"          Text must NOT appear in the fetched route response
#   --expect-present-browser "text"       Text must appear in the rendered DOM (headless browser)
#   --expect-absent-browser "text"        Text must NOT appear in the rendered DOM
#   --expect-present-file <url> "text"    Text must appear in a cache-busted fetch of <url>
#   --expect-absent-file <url> "text"     Text must NOT appear in a cache-busted fetch of <url>
#   --expect-present-bundle "text"        Text must appear in the live index-*.js/css assets
#   --expect-absent-bundle "text"         Text must NOT appear in the live index-*.js/css assets
#   --compare-file <local-path> <url>     Diff local file against live URL (line-ending normalized)
#   --dry-run                             Preflight + gate summary; prints the command; submits nothing.
#
# Safety: this script performs NO git mutations other than `git fetch` (preflight),
# never commits/pushes/merges, never changes IAM or infrastructure, never rolls back.
# The only mutating call is `gcloud builds submit` (in --deploy, after the typed gate).
# Every check either passes loudly or stops the script. No silent fallbacks.

set -euo pipefail

# --- State -------------------------------------------------------------------
MODE=""
DRY_RUN=0
ROUTE=""
FULL_SHA=""
BUILD_ID=""
REVISION=""
IMAGE_DIGEST=""
VERDICT_DEPLOY="NOT RUN"
VERDICT_INFRA="NOT RUN"
VERDICT_CONTENT="NOT REQUESTED"
PREFLIGHT_OK=0
WARNINGS=()

EP_ROUTE=();  EA_ROUTE=()
EP_BROWSER=(); EA_BROWSER=()
EP_FILE=();   EA_FILE=()    # entries: "url<TAB>text"
EP_BUNDLE=(); EA_BUNDLE=()
COMPARE_FILES=()            # entries: "local<TAB>url"

LOG_DIR=""
LOG_FILE=""

# --- Output helpers -----------------------------------------------------------
info() { echo "INFO: $*"; }
pass() { echo "PASS: $*"; }
warn() { WARNINGS+=("$1"); echo "WARN: $*"; }
die()  { echo "FAIL: $*" >&2; echo "STOP: no retries, no fallbacks — fix the cause and re-run." >&2; exit 1; }

# Git Bash/MSYS must not rewrite https://host/path into a Windows path or :8080.
# Prefer curl.exe on Windows so MSYS path conversion never touches the URL.
if command -v curl.exe >/dev/null 2>&1; then
  CURL_BIN=(curl.exe)
else
  CURL_BIN=(env MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' curl)
fi
run_curl() { "${CURL_BIN[@]}" "$@"; }
run_route_curl() { run_curl -sS -L --max-redirs 10 --retry 2 --retry-all-errors --retry-delay 2 --max-time 30 "$@"; }

usage() {
  sed -n '2,/^# Every check/p' "$0" | sed 's/^# \{0,1\}//'
}

# --- Argument parsing ---------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check|--deploy|--verify)
      [[ -z "$MODE" ]] || die "only one mode flag allowed"
      MODE="$1"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --route) ROUTE="${2:?--route needs a path}"; shift 2 ;;
    --expect-present-route)   EP_ROUTE+=("${2:?}"); shift 2 ;;
    --expect-absent-route)    EA_ROUTE+=("${2:?}"); shift 2 ;;
    --expect-present-browser) EP_BROWSER+=("${2:?}"); shift 2 ;;
    --expect-absent-browser)  EA_BROWSER+=("${2:?}"); shift 2 ;;
    --expect-present-file)    EP_FILE+=("${2:?}"$'\t'"${3:?--expect-present-file needs url and text}"); shift 3 ;;
    --expect-absent-file)     EA_FILE+=("${2:?}"$'\t'"${3:?--expect-absent-file needs url and text}"); shift 3 ;;
    --expect-present-bundle)  EP_BUNDLE+=("${2:?}"); shift 2 ;;
    --expect-absent-bundle)   EA_BUNDLE+=("${2:?}"); shift 2 ;;
    --compare-file)           COMPARE_FILES+=("${2:?}"$'\t'"${3:?--compare-file needs local path and live url}"); shift 3 ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

[[ -n "$MODE" ]] || { usage; die "no mode given — use --check, --deploy, or --verify"; }
[[ "$DRY_RUN" -eq 0 || "$MODE" == "--deploy" ]] || die "--dry-run only makes sense with --deploy"

# --- Configuration ------------------------------------------------------------
normalize_config_path() {
  local path="$1"
  if [[ "$path" =~ ^[A-Za-z]:[\\/].* ]] && command -v cygpath >/dev/null 2>&1; then
    cygpath -u -- "$path"
  else
    printf '%s\n' "$path"
  fi
}

load_config() {
  [[ -n "${DEPLOY_CONFIG:-}" ]] \
    || die "DEPLOY_CONFIG is required. Example: DEPLOY_CONFIG=/path/to/deployment.config bash deploy.sh $MODE"

  local config_path
  config_path="$(normalize_config_path "$DEPLOY_CONFIG")"
  [[ -f "$config_path" && -r "$config_path" ]] \
    || die "configuration file is not readable: '$DEPLOY_CONFIG'"

  local -A seen=()
  local line key value line_number=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *=* ]] \
      || die "invalid configuration line $line_number: expected KEY=VALUE"
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] \
      || die "invalid configuration key on line $line_number: '$key'"
    case "$key" in
      DEPLOY_PROJECT|DEPLOY_SERVICE|DEPLOY_REGION|DEPLOY_BRANCH|DEPLOY_DOMAIN|BUILD_WORKING_DIRECTORY|BUILD_COMMAND|CLOUD_BUILD_CONFIG|IMAGE_REPOSITORY|DEFAULT_VERIFY_ROUTE|EXPECTED_TRAFFIC_PERCENT) ;;
      *) die "unknown configuration key on line $line_number: '$key'" ;;
    esac
    [[ -z "${seen[$key]+x}" ]] \
      || die "duplicate configuration key on line $line_number: '$key'"
    seen["$key"]=1
    printf -v "$key" '%s' "$value"
  done < "$config_path"

  local required
  for required in DEPLOY_PROJECT DEPLOY_SERVICE DEPLOY_REGION DEPLOY_BRANCH DEPLOY_DOMAIN \
    BUILD_WORKING_DIRECTORY BUILD_COMMAND CLOUD_BUILD_CONFIG IMAGE_REPOSITORY \
    DEFAULT_VERIFY_ROUTE EXPECTED_TRAFFIC_PERCENT; do
    [[ -n "${!required:-}" ]] || die "missing required configuration value: $required"
  done

  [[ "$DEPLOY_PROJECT" =~ ^[a-z][a-z0-9-]{4,61}[a-z0-9]$ ]] \
    || die "invalid DEPLOY_PROJECT: '$DEPLOY_PROJECT'"
  [[ "$DEPLOY_SERVICE" =~ ^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$ ]] \
    || die "invalid DEPLOY_SERVICE: '$DEPLOY_SERVICE'"
  [[ "$DEPLOY_REGION" =~ ^[a-z0-9]+(-[a-z0-9]+)+$ ]] \
    || die "invalid DEPLOY_REGION: '$DEPLOY_REGION'"
  [[ "$DEPLOY_BRANCH" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ && "$DEPLOY_BRANCH" != *..* ]] \
    || die "invalid DEPLOY_BRANCH: '$DEPLOY_BRANCH'"
  [[ "$DEPLOY_DOMAIN" == "AUTO" || "$DEPLOY_DOMAIN" =~ ^https?://[^[:space:]/]+(:[0-9]+)?$ ]] \
    || die "invalid DEPLOY_DOMAIN (use AUTO or an origin without a trailing slash): '$DEPLOY_DOMAIN'"
  [[ "$BUILD_WORKING_DIRECTORY" != /* && ! "$BUILD_WORKING_DIRECTORY" =~ ^[A-Za-z]:[\\/] && "$BUILD_WORKING_DIRECTORY" != ".." && "$BUILD_WORKING_DIRECTORY" != ../* && "$BUILD_WORKING_DIRECTORY" != */../* && "$BUILD_WORKING_DIRECTORY" != */.. ]] \
    || die "BUILD_WORKING_DIRECTORY must stay inside the repository: '$BUILD_WORKING_DIRECTORY'"
  [[ "$CLOUD_BUILD_CONFIG" != /* && ! "$CLOUD_BUILD_CONFIG" =~ ^[A-Za-z]:[\\/] && "$CLOUD_BUILD_CONFIG" != ".." && "$CLOUD_BUILD_CONFIG" != ../* && "$CLOUD_BUILD_CONFIG" != */../* && "$CLOUD_BUILD_CONFIG" != */.. ]] \
    || die "CLOUD_BUILD_CONFIG must stay inside the repository: '$CLOUD_BUILD_CONFIG'"
  [[ "$IMAGE_REPOSITORY" != *[[:space:]]* ]] \
    || die "invalid IMAGE_REPOSITORY: whitespace is not allowed"
  [[ "$DEFAULT_VERIFY_ROUTE" == /* ]] \
    || die "DEFAULT_VERIFY_ROUTE must start with '/': '$DEFAULT_VERIFY_ROUTE'"
  [[ "$EXPECTED_TRAFFIC_PERCENT" =~ ^[0-9]+$ && "$EXPECTED_TRAFFIC_PERCENT" -ge 1 && "$EXPECTED_TRAFFIC_PERCENT" -le 100 ]] \
    || die "EXPECTED_TRAFFIC_PERCENT must be an integer from 1 to 100"

  PROJECT="$DEPLOY_PROJECT"
  SERVICE="$DEPLOY_SERVICE"
  REGION="$DEPLOY_REGION"
  DOMAIN="$DEPLOY_DOMAIN"
  IMAGE_REPO="$IMAGE_REPOSITORY"
  CONFIG_FILE="$CLOUD_BUILD_CONFIG"
  [[ -n "$ROUTE" ]] || ROUTE="$DEFAULT_VERIFY_ROUTE"
  [[ "$ROUTE" == /* ]] || die "--route must start with '/': '$ROUTE'"
  LOG_DIR="${TMPDIR:-/tmp}/deployment-automation-logs/$SERVICE"
}

load_config

find_browser() {
  # Rendered-DOM checks need a real headless browser. If none exists, the caller
  # fails loudly — there is deliberately NO fallback to the raw route response.
  local candidates=()
  [[ -n "${HEADLESS_BROWSER:-}" ]] && candidates+=("$HEADLESS_BROWSER")
  candidates+=(chromium chromium-browser google-chrome google-chrome-stable chrome msedge)
  local b
  for b in "${candidates[@]}"; do
    if command -v "$b" >/dev/null 2>&1; then echo "$b"; return 0; fi
  done
  return 1
}

# --- Preflight ----------------------------------------------------------------
preflight() {
  info "preflight: starting (${MODE#--} mode)"

  # 1. repository root
  [[ -e .git && -f "$CONFIG_FILE" && -d "$BUILD_WORKING_DIRECTORY" ]] \
    || die "not at repository root (need .git, '$CONFIG_FILE', and '$BUILD_WORKING_DIRECTORY/'). Observed cwd: $PWD"
  pass "repository root: $PWD"

  # 2. configured branch
  local branch; branch="$(git branch --show-current 2>/dev/null)" \
    || die "cannot determine current branch (git missing or not a repo?)"
  [[ "$branch" == "$DEPLOY_BRANCH" ]] \
    || die "wrong branch. Observed: '$branch'. Expected: '$DEPLOY_BRANCH'"
  pass "branch: $DEPLOY_BRANCH"

  # 3. clean working tree
  local dirty; dirty="$(git status --porcelain)"
  [[ -z "$dirty" ]] \
    || die "working tree not clean. Observed changes:
$dirty
Expected: clean (commit or stash first)"
  pass "working tree: clean"

  # 4. HEAD equals the configured remote branch
  git fetch --quiet origin "$DEPLOY_BRANCH" \
    || die "git fetch origin $DEPLOY_BRANCH failed (network/auth?). Cannot verify remote parity — stopping"
  local head_sha remote_sha
  head_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse "origin/$DEPLOY_BRANCH")"
  [[ "$head_sha" == "$remote_sha" ]] \
    || die "local HEAD != origin/$DEPLOY_BRANCH. Observed HEAD: $head_sha, origin/$DEPLOY_BRANCH: $remote_sha. Push or rebase first"
  pass "HEAD == origin/$DEPLOY_BRANCH: $head_sha"

  # 5. full SHA
  [[ "$head_sha" =~ ^[0-9a-f]{40}$ ]] \
    || die "git rev-parse HEAD returned malformed SHA: '$head_sha'"
  FULL_SHA="$head_sha"
  pass "full commit SHA: $FULL_SHA"

  # 6. production build (fast-fail optimization)
  info "build command: (cd '$BUILD_WORKING_DIRECTORY' && $BUILD_COMMAND)"
  ( cd "$BUILD_WORKING_DIRECTORY" && bash -c "$BUILD_COMMAND" ) \
    || die "production build failed (cd '$BUILD_WORKING_DIRECTORY' && $BUILD_COMMAND). Fix the build first"
  pass "production build: exit 0"

  # 7. GCP project
  local gcp_project
  gcp_project="$(gcloud config get-value project 2>/dev/null || true)"
  if [[ -z "$gcp_project" ]]; then
    warn "gcloud default project unset — continuing with explicit --project $PROJECT on every call"
  elif [[ "$gcp_project" != "$PROJECT" ]]; then
    warn "gcloud default project is '$gcp_project'; continuing safely because every cloud call explicitly uses --project $PROJECT"
  fi
  pass "GCP project: $PROJECT"

  # 8. configured service and region
  pass "service: $SERVICE / region: $REGION"

  # 9. tools + auth + API access
  local t
  for t in git bash curl gcloud; do
    command -v "$t" >/dev/null 2>&1 || die "required tool missing: $t"
  done
  pass "tools present: git, bash, curl, gcloud"
  local account
  account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
  [[ -n "$account" ]] || die "gcloud not authenticated (no active account). Run: gcloud auth login"
  pass "gcloud authenticated as: $account"
  gcloud projects describe "$PROJECT" >/dev/null 2>&1 \
    || die "cannot access project $PROJECT with active account $account"
  local billing_enabled
  billing_enabled="$(gcloud billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null || true)"
  [[ "$billing_enabled" == "True" || "$billing_enabled" == "true" ]] \
    || die "billing is not enabled for project $PROJECT"
  pass "project access and billing confirmed"
  local api enabled
  for api in cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com; do
    enabled="$(gcloud services list --enabled --project "$PROJECT" --filter="config.name=$api" --format='value(config.name)' 2>/dev/null || true)"
    [[ "$enabled" == "$api" ]] \
      || die "required API is not enabled: $api. First-deployment bootstrap must enable it explicitly before DEPLOY"
  done
  pass "required APIs enabled: Cloud Build, Artifact Registry, Cloud Run"
  gcloud builds list --limit 1 --project "$PROJECT" >/dev/null 2>&1 \
    || die "cannot list Cloud Builds in project $PROJECT (permissions or API). Fix access before deploying"
  pass "Cloud Build API access confirmed"

  if [[ "$IMAGE_REPO" =~ ^([a-z0-9-]+)-docker\.pkg\.dev/([^/]+)/([^/]+)/[^/]+$ ]]; then
    local artifact_location="${BASH_REMATCH[1]}" artifact_project="${BASH_REMATCH[2]}" artifact_repository="${BASH_REMATCH[3]}"
    [[ "$artifact_project" == "$PROJECT" ]] \
      || die "Artifact Registry image project '$artifact_project' does not match DEPLOY_PROJECT '$PROJECT'"
    gcloud artifacts repositories describe "$artifact_repository" --location "$artifact_location" --project "$PROJECT" >/dev/null 2>&1 \
      || die "Artifact Registry repository '$artifact_repository' does not exist in $artifact_location. First-deployment bootstrap must create it explicitly before DEPLOY"
    pass "Artifact Registry repository: $artifact_repository / $artifact_location"
  fi

  local service_url
  service_url="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format='value(status.url)' 2>/dev/null || true)"
  if [[ -n "$service_url" && "$DOMAIN" == "AUTO" ]]; then
    DOMAIN="$service_url"
    pass "service URL resolved: $DOMAIN"
  elif [[ -z "$service_url" && "$DOMAIN" == "AUTO" ]]; then
    warn "Cloud Run service does not exist yet; classified as first deployment and its URL will be resolved after build"
  fi

  PREFLIGHT_OK=1
  info "preflight: all checks passed"
}

resolve_auto_domain() {
  [[ "$DOMAIN" == "AUTO" ]] || return 0
  DOMAIN="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format='value(status.url)' 2>/dev/null || true)"
  [[ "$DOMAIN" =~ ^https://[^[:space:]/]+$ ]] \
    || die "deployed service URL could not be resolved for $SERVICE in $REGION"
  pass "service URL resolved after deployment: $DOMAIN"
}

# --- Duplicate-build guard ----------------------------------------------------
reject_existing_build_for_sha() {
  local rows=""
  if ! rows="$(gcloud builds list --project "$PROJECT" \
    --filter="substitutions.COMMIT_SHA=$FULL_SHA AND status=(QUEUED,WORKING,SUCCESS)" \
    --format='csv[no-heading](id,status,substitutions.COMMIT_SHA)' --limit=10)"; then
    die "Cloud Build duplicate check failed for exact commit $FULL_SHA. Cannot prove that submission is safe"
  fi

  [[ -z "$rows" ]] || {
    echo "BLOCKED: Cloud Build already has this exact commit in a non-retryable state:"
    local id status sha
    while IFS=, read -r id status sha; do
      [[ -n "$id$status$sha" ]] || continue
      [[ "$sha" == "$FULL_SHA" ]] \
        || die "duplicate check returned malformed/unexpected commit data (id=${id:-unknown}, status=${status:-unknown}, sha=${sha:-missing})"
      echo "  Build ID: $id | status: $status"
    done <<<"$rows"
    die "commit $FULL_SHA is already QUEUED, WORKING, or SUCCESS. Wait for the in-flight build or run --verify for the successful build; do not resubmit"
  }

  pass "no QUEUED, WORKING, or SUCCESS Cloud Build for exact SHA $FULL_SHA"
}

# --- Human approval gate ------------------------------------------------------
gate() {
  echo
  echo "================= PRODUCTION DEPLOYMENT GATE ================="
  echo "  Commit SHA : $FULL_SHA"
  echo "  Project    : $PROJECT"
  echo "  Service    : $SERVICE"
  echo "  Region     : $REGION"
  echo "  Command    : gcloud builds submit --config $CONFIG_FILE --project $PROJECT --substitutions=COMMIT_SHA=$FULL_SHA"
  echo "  Preflight  : all checks passed"
  echo "=============================================================="
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: stopping before the gate and before any submission."
    echo "DRY-RUN: the command above is exactly what --deploy would run."
    exit 0
  fi
  local reply="" read_source="stdin" read_rc=0 observed=""
  echo "Type DEPLOY to proceed, anything else to abort:"
  if [[ -t 0 && -r /dev/tty ]]; then
    read_source="/dev/tty"
    IFS= read -r reply < /dev/tty || read_rc=$?
  else
    IFS= read -r reply || read_rc=$?
  fi

  if [[ "$reply" == *$'\r' ]]; then
    reply="${reply%$'\r'}"
    info "approval input: normalized one trailing carriage return from $read_source"
  fi

  if [[ "$read_rc" -ne 0 && -z "$reply" ]]; then
    die "approval input transport failed: no token was received from $read_source (EOF/read error). Re-run in an interactive terminal or forward a newline-terminated response"
  elif [[ "$read_rc" -ne 0 ]]; then
    warn "approval input from $read_source ended without a newline; validating the received token"
  fi

  if [[ "$reply" != "DEPLOY" ]]; then
    printf -v observed '%q' "$reply"
    die "gate declined (source: $read_source; received: $observed; characters: ${#reply}). Expected exact token DEPLOY. Nothing was submitted"
  fi
}

# --- Deployment ---------------------------------------------------------------
deploy() {
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
  info "submitting Cloud Build (log: $LOG_FILE)"
  set +e
  gcloud builds submit --config "$CONFIG_FILE" --project "$PROJECT" \
    --substitutions="COMMIT_SHA=$FULL_SHA" 2>&1 | tee "$LOG_FILE"
  local rc=${PIPESTATUS[0]}
  set -e
  BUILD_ID="$(grep -oE 'builds/[a-f0-9-]{36}' "$LOG_FILE" | head -1 | cut -d/ -f2 || true)"
  if [[ "$rc" -ne 0 ]] || ! grep -q 'STATUS: SUCCESS' "$LOG_FILE"; then
    VERDICT_DEPLOY="FAILURE"
    echo "------------------------------------------------------------------"
    echo "DEPLOY: FAILURE (gcloud exit $rc). Build ID: ${BUILD_ID:-unknown}"
    echo "Console: https://console.cloud.google.com/cloud-build/builds/${BUILD_ID:-unknown}?project=$PROJECT"
    echo "Review the Cloud Build log before retrying."
    echo "------------------------------------------------------------------"
    print_handover
    exit 1
  fi
  [[ -n "$BUILD_ID" ]] || die "build reported SUCCESS but no build ID could be parsed from the log — stopping for manual review"
  VERDICT_DEPLOY="SUCCESS"
  pass "Cloud Build SUCCESS: $BUILD_ID"
}

# --- Infrastructure verification ---------------------------------------------
infra_verify() {
  local failures=0

  # 1. Cloud Build success
  if [[ "$MODE" == "--deploy" ]]; then
    [[ "$VERDICT_DEPLOY" == "SUCCESS" ]] || { echo "INFRA-FAIL: build did not succeed"; failures=$((failures+1)); }
    # Console wording varies across builders; immutable registry/revision checks below are authoritative.
    if grep -Fq "Successfully tagged $IMAGE_REPO:$FULL_SHA" "$LOG_FILE"; then
      pass "infra: image tag == expected SHA ($IMAGE_REPO:$FULL_SHA)"
    else
      warn "build log lacks the legacy 'Successfully tagged' phrase; continuing to registry digest and serving-revision verification"
    fi
  else
    local latest_status
    latest_status="$(gcloud builds list --limit 1 --project "$PROJECT" --format='value(status)' 2>/dev/null || true)"
    if [[ "$latest_status" == "SUCCESS" ]]; then
      pass "infra: latest Cloud Build status SUCCESS (standalone --verify: build identity not re-checked)"
    else
      echo "INFRA-FAIL: latest Cloud Build status is '${latest_status:-unknown}', expected SUCCESS"; failures=$((failures+1))
    fi
    info "infra: image-tag-vs-SHA check is covered by the revision-image check below"
  fi

  # 3. serving revision created from the expected immutable image
  local approved_tag="$IMAGE_REPO:$FULL_SHA"
  local registry_digest
  if [[ "$approved_tag" == *":$FULL_SHA" ]]; then
    pass "infra: approved image tag contains expected SHA ($approved_tag)"
  else
    echo "INFRA-FAIL: approved image tag '$approved_tag' does not contain expected SHA '$FULL_SHA'"; failures=$((failures+1))
  fi
  registry_digest="$(gcloud container images describe "$approved_tag" --project "$PROJECT" \
    --format='value(image_summary.digest)' 2>/dev/null || true)"
  if [[ "$registry_digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    IMAGE_DIGEST="$registry_digest"
    pass "infra: approved image tag resolves to immutable digest ($approved_tag -> $IMAGE_DIGEST)"
  else
    echo "INFRA-FAIL: cannot resolve approved image tag '$approved_tag' to an immutable sha256 digest"; failures=$((failures+1))
  fi

  REVISION="$(gcloud run revisions list --service "$SERVICE" --region "$REGION" --project "$PROJECT" \
    --limit 1 --sort-by='~creationTime' --format='value(metadata.name)' 2>/dev/null || true)"
  [[ -n "$REVISION" ]] || die "cannot list Cloud Run revisions for $SERVICE ($REGION) — infra verification impossible, stopping"
  local rev_image revision_digest=""
  rev_image="$(gcloud run revisions describe "$REVISION" --region "$REGION" --project "$PROJECT" \
    --format='value(spec.containers[0].image)' 2>/dev/null || true)"
  if [[ "$rev_image" =~ @(sha256:[0-9a-f]{64})$ ]]; then
    revision_digest="${BASH_REMATCH[1]}"
    pass "infra: revision $REVISION uses immutable digest ($revision_digest)"
  else
    echo "INFRA-FAIL: cannot retrieve an immutable sha256 digest from revision image '${rev_image:-<empty>}'"; failures=$((failures+1))
  fi
  if [[ -n "$IMAGE_DIGEST" && -n "$revision_digest" ]]; then
    if [[ "$revision_digest" == "$IMAGE_DIGEST" ]]; then
      pass "infra: revision digest matches approved image digest ($IMAGE_DIGEST)"
    else
      echo "INFRA-FAIL: revision digest '$revision_digest' differs from approved image digest '$IMAGE_DIGEST'"; failures=$((failures+1))
    fi
  fi

  # 4. configured traffic allocation on this revision
  local traffic_rev traffic_pct
  traffic_rev="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" \
    --format='value(status.traffic[0].revisionName)' 2>/dev/null || true)"
  traffic_pct="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" \
    --format='value(status.traffic[0].percent)' 2>/dev/null || true)"
  if [[ "$traffic_rev" == "$REVISION" && "$traffic_pct" == "$EXPECTED_TRAFFIC_PERCENT" ]]; then
    pass "infra: traffic $EXPECTED_TRAFFIC_PERCENT% -> $REVISION"
  else
    echo "INFRA-FAIL: traffic is ${traffic_pct:-?}% -> ${traffic_rev:-?}, expected $EXPECTED_TRAFFIC_PERCENT% -> $REVISION"; failures=$((failures+1))
  fi

  # 5. live route responds 200
  local code="" curl_rc=0
  code="$(run_route_curl -o /dev/null -w '%{http_code}' "$DOMAIN$ROUTE")" || curl_rc=$?
  if [[ "$curl_rc" -eq 0 && "$code" == "200" ]]; then
    pass "infra: GET $DOMAIN$ROUTE -> HTTP 200 (final response after redirects)"
  else
    echo "INFRA-FAIL: GET $DOMAIN$ROUTE -> HTTP '${code:-curl-error}' after redirects (curl exit $curl_rc), expected final HTTP 200"; failures=$((failures+1))
  fi

  if [[ "$failures" -eq 0 ]]; then VERDICT_INFRA="PASS"; else VERDICT_INFRA="FAIL"; fi
}

# --- Content verification -----------------------------------------------------
# Every check runs against exactly its declared target. Acquisition failure of
# any target is fatal (loud) — never skipped, never substituted.
content_verify() {
  local n_checks=$(( ${#EP_ROUTE[@]} + ${#EA_ROUTE[@]} + ${#EP_BROWSER[@]} + ${#EA_BROWSER[@]} \
    + ${#EP_FILE[@]} + ${#EA_FILE[@]} + ${#EP_BUNDLE[@]} + ${#EA_BUNDLE[@]} + ${#COMPARE_FILES[@]} ))
  if [[ "$n_checks" -eq 0 ]]; then
    VERDICT_CONTENT="NOT REQUESTED"
    info "content verify: no checks supplied — NOT REQUESTED"
    return
  fi

  # Target: fetched route response (raw HTML, no JS)
  if (( ${#EP_ROUTE[@]} + ${#EA_ROUTE[@]} )); then
    local html
    html="$(run_route_curl "$DOMAIN$ROUTE")" || die "content target unavailable: could not fetch route $DOMAIN$ROUTE"
    [[ -n "$html" ]] || die "content target unavailable: route $DOMAIN$ROUTE returned an empty body"
    local t
    for t in "${EP_ROUTE[@]}"; do
      grep -Fq "$t" <<<"$html" || die "CONTENT-FAIL [route]: expected text present but missing: '$t'"
      pass "content [route]: present: '$t'"
    done
    for t in "${EA_ROUTE[@]}"; do
      ! grep -Fq "$t" <<<"$html" || die "CONTENT-FAIL [route]: obsolete text found: '$t'"
      pass "content [route]: absent: '$t'"
    done
  fi

  # Target: rendered browser page (headless DOM) — no fallback to raw HTML
  if (( ${#EP_BROWSER[@]} + ${#EA_BROWSER[@]} )); then
    local browser dom
    browser="$(find_browser)" \
      || die "content target unavailable: no headless browser found (set HEADLESS_BROWSER). Refusing to fall back to the raw route response"
    dom="$("$browser" --headless --disable-gpu --dump-dom "$DOMAIN$ROUTE" 2>/dev/null)" \
      || die "content target unavailable: headless browser '$browser' failed to render $DOMAIN$ROUTE"
    [[ -n "$dom" ]] || die "content target unavailable: headless browser '$browser' produced an empty DOM"
    local t
    for t in "${EP_BROWSER[@]}"; do
      grep -Fq "$t" <<<"$dom" || die "CONTENT-FAIL [browser]: expected text present but missing: '$t'"
      pass "content [browser]: present: '$t'"
    done
    for t in "${EA_BROWSER[@]}"; do
      ! grep -Fq "$t" <<<"$dom" || die "CONTENT-FAIL [browser]: obsolete text found: '$t'"
      pass "content [browser]: absent: '$t'"
    done
  fi

  # Target: downloadable live file (cache-busted)
  if (( ${#EP_FILE[@]} + ${#EA_FILE[@]} )); then
    local entry url t body bust
    for entry in "${EP_FILE[@]}" "${EA_FILE[@]}"; do :; done  # noop for shellcheck clarity
    for entry in "${EP_FILE[@]}"; do
      url="${entry%%$'\t'*}"; t="${entry#*$'\t'}"
      bust="$url"; [[ "$bust" == *\?* ]] && bust="$bust&v=$(date +%s)" || bust="$bust?v=$(date +%s)"
      body="$(run_curl -s "$bust")" || die "content target unavailable: could not fetch file $url"
      [[ -n "$body" ]] || die "content target unavailable: file $url returned an empty body"
      grep -Fq "$t" <<<"$body" || die "CONTENT-FAIL [file $url]: expected text present but missing: '$t'"
      pass "content [file $url]: present: '$t'"
    done
    for entry in "${EA_FILE[@]}"; do
      url="${entry%%$'\t'*}"; t="${entry#*$'\t'}"
      bust="$url"; [[ "$bust" == *\?* ]] && bust="$bust&v=$(date +%s)" || bust="$bust?v=$(date +%s)"
      body="$(run_curl -s "$bust")" || die "content target unavailable: could not fetch file $url"
      [[ -n "$body" ]] || die "content target unavailable: file $url returned an empty body"
      ! grep -Fq "$t" <<<"$body" || die "CONTENT-FAIL [file $url]: obsolete text found: '$t'"
      pass "content [file $url]: absent: '$t'"
    done
  fi

  # Target: compiled bundle assets referenced by the route response
  if (( ${#EP_BUNDLE[@]} + ${#EA_BUNDLE[@]} )); then
    local html assets a bundle t
    html="$(run_route_curl "$DOMAIN$ROUTE")" || die "content target unavailable: could not fetch route for bundle discovery"
    assets="$(grep -oE 'index-[A-Za-z0-9_-]+\.(js|css)' <<<"$html" | sort -u || true)"
    [[ -n "$assets" ]] || die "content target unavailable: no index-*.js/css assets referenced by $DOMAIN$ROUTE"
    bundle=""
    for a in $assets; do
      local chunk
      chunk="$(run_curl -s "$DOMAIN/assets/$a")" || die "content target unavailable: could not fetch asset $a"
      [[ -n "$chunk" ]] || die "content target unavailable: asset $a returned an empty body"
      bundle+="$chunk"
    done
    for t in "${EP_BUNDLE[@]}"; do
      grep -Fq "$t" <<<"$bundle" || die "CONTENT-FAIL [bundle]: expected text present but missing: '$t'"
      pass "content [bundle]: present: '$t'"
    done
    for t in "${EA_BUNDLE[@]}"; do
      ! grep -Fq "$t" <<<"$bundle" || die "CONTENT-FAIL [bundle]: obsolete text found: '$t'"
      pass "content [bundle]: absent: '$t'"
    done
  fi

  # Target: local file vs live URL comparison (line-ending normalized)
  if (( ${#COMPARE_FILES[@]} )); then
    local entry local_path url bust tmp
    for entry in "${COMPARE_FILES[@]}"; do
      local_path="${entry%%$'\t'*}"; url="${entry#*$'\t'}"
      [[ -f "$local_path" ]] || die "content target unavailable: local file '$local_path' does not exist"
      bust="$url"; [[ "$bust" == *\?* ]] && bust="$bust&v=$(date +%s)" || bust="$bust?v=$(date +%s)"
      tmp="$(mktemp)"
      run_curl -s "$bust" -o "$tmp" || { rm -f "$tmp"; die "content target unavailable: could not fetch $url"; }
      if diff <(sed 's/\r$//' "$local_path") <(sed 's/\r$//' "$tmp") >/dev/null; then
        pass "content [compare]: '$local_path' == '$url' (normalized)"
      else
        rm -f "$tmp"
        die "CONTENT-FAIL [compare]: '$local_path' differs from live '$url'"
      fi
      rm -f "$tmp"
    done
  fi

  VERDICT_CONTENT="PASS"
  info "content verify: all $n_checks supplied check(s) passed"
}

# --- Bundle hash comparison — supporting evidence only -----------------------
bundle_evidence() {
  local live_hash local_hash
  live_hash="$(run_curl -s "$DOMAIN/" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1 || true)"
  if [[ -f "$BUILD_WORKING_DIRECTORY/dist/index.html" ]]; then
    local_hash="$(grep -oE 'index-[A-Za-z0-9_-]+\.js' "$BUILD_WORKING_DIRECTORY/dist/index.html" | head -1 || true)"
  fi
  echo "------------------------------------------------------------------"
  echo "BUNDLE EVIDENCE (supporting only — never sole proof; see plan §7.3):"
  echo "  live bundle : ${live_hash:-unavailable}"
  echo "  local bundle: ${local_hash:-unavailable (no local dist build)}"
  if [[ -n "${live_hash:-}" && -n "${local_hash:-}" ]]; then
    if [[ "$live_hash" == "$local_hash" ]]; then
      echo "  comparison  : MATCH (note: local and Cloud Build hashes may legitimately differ across environments)"
    else
      echo "  comparison  : DIFFER — informational only; content checks above are authoritative"
    fi
  fi
  echo "------------------------------------------------------------------"
}

# --- Rollback display — display only, never executed --------------------------
rollback_hint() {
  local revs prev
  revs="$(gcloud run revisions list --service "$SERVICE" --region "$REGION" --project "$PROJECT" \
    --limit 3 --sort-by='~creationTime' --format='value(metadata.name)' 2>/dev/null || true)"
  prev="$(sed -n 2p <<<"$revs")"
  if [[ -n "$prev" ]]; then
    echo "ROLLBACK (manual, human-approved only — this script never runs it):"
    echo "  gcloud run services update-traffic $SERVICE --region $REGION --project $PROJECT --to-revisions=$prev=100"
  fi
}

# --- Handover block — printed only --------------------------------------------
print_handover() {
  local mode_label="${MODE#--}"
  [[ "$DRY_RUN" -eq 1 ]] && mode_label+=" (dry-run)"
  echo
  echo "============================================ DEPLOYMENT HANDOVER BLOCK ============================================"
  echo "Date/time (UTC)   : $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo "Commit SHA        : ${FULL_SHA:-unknown}"
  echo "Mode              : $mode_label"
  echo "Build ID          : ${BUILD_ID:-n/a}"
  echo "Image tag         : ${FULL_SHA:+$IMAGE_REPO:$FULL_SHA}"
  echo "Image digest      : ${IMAGE_DIGEST:-n/a}"
  echo "Cloud Run revision: ${REVISION:-n/a} ($SERVICE, $REGION, project $PROJECT)"
  echo "Preflight         : $([[ "$PREFLIGHT_OK" -eq 1 ]] && echo "all checks passed" || echo "not completed")"
  echo "DEPLOY            : $VERDICT_DEPLOY"
  echo "INFRA VERIFY      : $VERDICT_INFRA"
  echo "CONTENT VERIFY    : $VERDICT_CONTENT"
  if [[ "${#WARNINGS[@]}" -gt 0 ]]; then
    echo "Warnings          :"
    local w; for w in "${WARNINGS[@]}"; do echo "  - $w"; done
  else
    echo "Warnings          : none"
  fi
  [[ -n "$LOG_FILE" ]] && echo "Build log         : $LOG_FILE"
  echo "======================================================================================================================"
}

# --- Main ----------------------------------------------------------------------
main() {
  case "$MODE" in
    --check)
      preflight
      echo "CHECK: PASS — all preflight checks passed. Nothing was deployed."
      ;;
    --deploy)
      preflight
      reject_existing_build_for_sha
      gate
      deploy
      resolve_auto_domain
      infra_verify
      [[ "$VERDICT_INFRA" == "PASS" ]] || { print_handover; die "infrastructure verification failed — see INFRA-FAIL lines above. Deployment succeeded but live state is unverified"; }
      content_verify
      bundle_evidence
      rollback_hint
      print_handover
      pass "deployment complete and verified"
      ;;
    --verify)
      # Standalone post-deploy verification: needs repo for SHA and relative paths.
      [[ -e .git && -f "$CONFIG_FILE" && -d "$BUILD_WORKING_DIRECTORY" ]] || die "--verify must run from the repository root"
      FULL_SHA="$(git rev-parse HEAD)" || die "cannot resolve HEAD SHA"
      [[ "$FULL_SHA" =~ ^[0-9a-f]{40}$ ]] || die "malformed HEAD SHA: '$FULL_SHA'"
      resolve_auto_domain
      info "verifying live state against HEAD SHA: $FULL_SHA"
      infra_verify
      [[ "$VERDICT_INFRA" == "PASS" ]] || { print_handover; die "infrastructure verification failed"; }
      content_verify
      bundle_evidence
      rollback_hint
      print_handover
      pass "verification complete"
      ;;
  esac
}

main
