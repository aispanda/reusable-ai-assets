#!/usr/bin/env bash
# Reusable Cloud Run staging and exact-image promotion controller.
# Mutations: Cloud Build + staging update after STAGE; production update after DEPLOY.

set -euo pipefail

if [[ -d /usr/bin ]]; then export PATH="$PATH:/usr/bin:/bin"; fi

MODE=""
DRY_RUN=0
FULL_SHA=""
BUILD_ID=""
IMAGE_DIGEST=""
STAGING_REVISION=""
STAGING_URL=""
STAGING_TRAFFIC=""
PRODUCTION_REVISION=""
PRODUCTION_URL=""
PRODUCTION_TRAFFIC=""
STAGING_TAG_URL=""
PRODUCTION_TAG_URL=""
STAGING_TAG=""
PRODUCTION_TAG=""
STAGING_RUNTIME_STATE_HASH=""
PRODUCTION_RUNTIME_STATE_HASH=""
TARGET_TRAFFIC=""
PROFILE_HASH=""
RUNTIME_CONFIG_HASH=""
RULES_HASH=""
SHORT_SHA=""

info() { echo "INFO: $*"; }
pass() { echo "PASS: $*"; }
die() { echo "FAIL: $*" >&2; echo "STOP: no retries or fallbacks." >&2; exit 1; }

# Git Bash/MSYS must not rewrite HTTPS URLs into Windows paths.
if command -v curl.exe >/dev/null 2>&1; then
  CURL_BIN=(curl.exe)
else
  CURL_BIN=(env MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' curl)
fi
run_route_curl() {
  "${CURL_BIN[@]}" -sS -L --max-redirs 10 --retry 2 --retry-all-errors --retry-delay 2 --max-time 30 "$@"
}

usage() {
  cat <<'EOF'
Usage: STAGED_RELEASE_CONFIG=/path/to/config bash staged_release.sh MODE [--dry-run]

Modes:
  --check         Validate repository, isolation, tools and existing cloud prerequisites.
  --stage         Build once, deploy immutable digest to staging, test, and write receipt.
  --verify-stage  Re-verify the receipt, staging digest, route and project test command.
  --promote       Promote the receipt's exact digest to production without rebuilding.

--stage requires exact token STAGE. --promote requires exact token DEPLOY.
First-time infrastructure, IAM, secrets, DNS and database creation are never performed.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check|--stage|--verify-stage|--promote)
      [[ -z "$MODE" ]] || die "only one mode is allowed"
      MODE="$1"; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ -n "$MODE" ]] || { usage; die "select a mode"; }
[[ "$DRY_RUN" -eq 0 || "$MODE" == "--stage" || "$MODE" == "--promote" ]] \
  || die "--dry-run is valid only with --stage or --promote"

normalize_path() {
  local path="$1"
  if [[ "$path" =~ ^[A-Za-z]:[\\/].* ]] && command -v cygpath >/dev/null 2>&1; then
    cygpath -u -- "$path"
  else
    printf '%s\n' "$path"
  fi
}

load_config() {
  [[ -n "${STAGED_RELEASE_CONFIG:-}" ]] || die "STAGED_RELEASE_CONFIG is required"
  CONFIG_PATH="$(normalize_path "$STAGED_RELEASE_CONFIG")"
  [[ -f "$CONFIG_PATH" && -r "$CONFIG_PATH" ]] || die "configuration is not readable: $STAGED_RELEASE_CONFIG"
  local -A seen=()
  local line key value line_number=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1)); line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *=* ]] || die "invalid configuration line $line_number"
    key="${line%%=*}"; value="${line#*=}"
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || die "invalid key on line $line_number: $key"
    case "$key" in
      RELEASE_PROJECT|STAGING_PROJECT|PRODUCTION_PROJECT|STAGING_SERVICE|PRODUCTION_SERVICE|STAGING_RUNTIME_IDENTITY|PRODUCTION_RUNTIME_IDENTITY|BUILD_SERVICE_ACCOUNT|SOURCE_BUCKET|REGION|RELEASE_BRANCH|STAGING_DOMAIN|PRODUCTION_DOMAIN|BUILD_WORKING_DIRECTORY|BUILD_COMMAND|CLOUD_BUILD_CONFIG|IMAGE_REPOSITORY|ISOLATION_VERIFY_COMMAND|STAGING_PREREQUISITE_VERIFY_COMMAND|PRODUCTION_PREREQUISITE_VERIFY_COMMAND|STAGING_VERIFY_COMMAND|RUNTIME_CONFIG_FILES|RULES_FILE|HEALTH_ROUTE|STAGING_DATA_BOUNDARY|PRODUCTION_DATA_BOUNDARY|STAGING_RECEIPT|PROMOTION_RECEIPT|EXPECTED_STAGING_TRAFFIC_PERCENT|EXPECTED_PRODUCTION_TRAFFIC_PERCENT|RECEIPT_MAX_AGE_HOURS) ;;
      *) die "unknown configuration key on line $line_number: $key" ;;
    esac
    [[ -z "${seen[$key]+x}" ]] || die "duplicate configuration key: $key"
    seen["$key"]=1; printf -v "$key" '%s' "$value"
  done < "$CONFIG_PATH"

  local required
  for required in RELEASE_PROJECT STAGING_PROJECT PRODUCTION_PROJECT STAGING_SERVICE PRODUCTION_SERVICE STAGING_RUNTIME_IDENTITY PRODUCTION_RUNTIME_IDENTITY BUILD_SERVICE_ACCOUNT SOURCE_BUCKET REGION RELEASE_BRANCH STAGING_DOMAIN PRODUCTION_DOMAIN BUILD_WORKING_DIRECTORY BUILD_COMMAND CLOUD_BUILD_CONFIG IMAGE_REPOSITORY ISOLATION_VERIFY_COMMAND STAGING_PREREQUISITE_VERIFY_COMMAND PRODUCTION_PREREQUISITE_VERIFY_COMMAND STAGING_VERIFY_COMMAND RUNTIME_CONFIG_FILES RULES_FILE HEALTH_ROUTE STAGING_DATA_BOUNDARY PRODUCTION_DATA_BOUNDARY STAGING_RECEIPT PROMOTION_RECEIPT EXPECTED_STAGING_TRAFFIC_PERCENT EXPECTED_PRODUCTION_TRAFFIC_PERCENT RECEIPT_MAX_AGE_HOURS; do
    [[ -n "${!required:-}" ]] || die "missing configuration value: $required"
  done

  local project
  for project in "$RELEASE_PROJECT" "$STAGING_PROJECT" "$PRODUCTION_PROJECT"; do
    [[ "$project" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || die "invalid Google Cloud project ID: $project"
  done
  local service
  for service in "$STAGING_SERVICE" "$PRODUCTION_SERVICE"; do
    [[ "$service" =~ ^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$ ]] || die "invalid Cloud Run service: $service"
  done
  [[ "$RELEASE_PROJECT" != "$STAGING_PROJECT" && "$RELEASE_PROJECT" != "$PRODUCTION_PROJECT" && "$STAGING_PROJECT" != "$PRODUCTION_PROJECT" ]] \
    || die "release, staging and production must use three different Google Cloud projects"
  [[ "$STAGING_SERVICE" != "$PRODUCTION_SERVICE" || "$STAGING_PROJECT" != "$PRODUCTION_PROJECT" ]] || die "staging and production service targets must differ"
  [[ "$STAGING_DATA_BOUNDARY" != "$PRODUCTION_DATA_BOUNDARY" ]] || die "staging and production data boundaries must differ"
  [[ "$STAGING_RUNTIME_IDENTITY" != "$PRODUCTION_RUNTIME_IDENTITY" ]] || die "staging and production runtime identities must differ"
  [[ "$STAGING_RUNTIME_IDENTITY" =~ ^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com$ ]] || die "invalid STAGING_RUNTIME_IDENTITY"
  [[ "$PRODUCTION_RUNTIME_IDENTITY" =~ ^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com$ ]] || die "invalid PRODUCTION_RUNTIME_IDENTITY"
  [[ "$BUILD_SERVICE_ACCOUNT" =~ ^[A-Za-z0-9._+-]+@$RELEASE_PROJECT\.iam\.gserviceaccount\.com$ ]] || die "BUILD_SERVICE_ACCOUNT must belong to RELEASE_PROJECT"
  [[ "$SOURCE_BUCKET" =~ ^gs://[a-z0-9][a-z0-9._-]{1,61}[a-z0-9](/[^[:space:]]*)?$ ]] || die "SOURCE_BUCKET must be a Cloud Storage gs:// path"
  [[ "$BUILD_SERVICE_ACCOUNT" != "$STAGING_RUNTIME_IDENTITY" && "$BUILD_SERVICE_ACCOUNT" != "$PRODUCTION_RUNTIME_IDENTITY" ]] || die "build and runtime identities must differ"
  [[ "$ISOLATION_VERIFY_COMMAND" != NONE ]] || die "ISOLATION_VERIFY_COMMAND is mandatory and must prove the consumer's effective isolation boundary"
  [[ "$STAGING_DATA_BOUNDARY" == "project:$STAGING_PROJECT" || "$STAGING_DATA_BOUNDARY" == "project:$STAGING_PROJECT/"* ]] || die "STAGING_DATA_BOUNDARY must belong to STAGING_PROJECT"
  [[ "$PRODUCTION_DATA_BOUNDARY" == "project:$PRODUCTION_PROJECT" || "$PRODUCTION_DATA_BOUNDARY" == "project:$PRODUCTION_PROJECT/"* ]] || die "PRODUCTION_DATA_BOUNDARY must belong to PRODUCTION_PROJECT"
  [[ "$REGION" =~ ^[a-z0-9]+(-[a-z0-9]+)+$ ]] || die "invalid region: $REGION"
  [[ "$RELEASE_BRANCH" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ && "$RELEASE_BRANCH" != *..* ]] || die "invalid branch: $RELEASE_BRANCH"
  [[ "$STAGING_DOMAIN" == AUTO || "$STAGING_DOMAIN" =~ ^https://[^[:space:]/]+$ ]] || die "invalid STAGING_DOMAIN"
  [[ "$PRODUCTION_DOMAIN" == AUTO || "$PRODUCTION_DOMAIN" =~ ^https://[^[:space:]/]+$ ]] || die "invalid PRODUCTION_DOMAIN"
  [[ "$STAGING_DOMAIN" == AUTO || "$PRODUCTION_DOMAIN" == AUTO || "$STAGING_DOMAIN" != "$PRODUCTION_DOMAIN" ]] || die "staging and production domains must differ"
  [[ "$HEALTH_ROUTE" == /* ]] || die "HEALTH_ROUTE must start with /"
  [[ "$EXPECTED_STAGING_TRAFFIC_PERCENT" =~ ^[0-9]+$ && "$EXPECTED_STAGING_TRAFFIC_PERCENT" -ge 1 && "$EXPECTED_STAGING_TRAFFIC_PERCENT" -le 100 ]] || die "invalid EXPECTED_STAGING_TRAFFIC_PERCENT"
  [[ "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT" =~ ^[0-9]+$ && "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT" -ge 1 && "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT" -le 100 ]] || die "invalid EXPECTED_PRODUCTION_TRAFFIC_PERCENT"
  [[ "$RECEIPT_MAX_AGE_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]] || die "RECEIPT_MAX_AGE_HOURS must be numeric"
  local relative
  for relative in "$BUILD_WORKING_DIRECTORY" "$CLOUD_BUILD_CONFIG" "$STAGING_RECEIPT" "$PROMOTION_RECEIPT"; do
    [[ "$relative" != /* && ! "$relative" =~ ^[A-Za-z]:[\\/] && "$relative" != ".." && "$relative" != ../* && "$relative" != */../* && "$relative" != */.. ]] || die "project path must stay inside the repository: $relative"
  done
  [[ "$IMAGE_REPOSITORY" =~ ^([a-z0-9-]+)-docker\.pkg\.dev/([^/]+)/([^/]+)/([^/]+)$ ]] || die "IMAGE_REPOSITORY must be an Artifact Registry Docker path"
  [[ "${BASH_REMATCH[2]}" == "$RELEASE_PROJECT" ]] || die "IMAGE_REPOSITORY project must equal RELEASE_PROJECT"
}
load_config

find_python() {
  if [[ -n "${STAGED_RELEASE_PYTHON:-}" ]]; then
    local configured; configured="$(normalize_path "$STAGED_RELEASE_PYTHON")"
    [[ -f "$configured" ]] && "$configured" -B -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 8) else 1)' >/dev/null 2>&1 || return 1
    echo "$configured"
  elif command -v python3 >/dev/null 2>&1 && python3 -B -c 'import sys' >/dev/null 2>&1; then echo python3
  elif command -v python >/dev/null 2>&1 && python -B -c 'import sys' >/dev/null 2>&1; then echo python
  else return 1; fi
}

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECEIPT_TOOL="$TOOLKIT_DIR/scripts/staged_release_receipt.py"
PYTHON_BIN=""

receipt_args() {
  printf '%s\0' --file "$STAGING_RECEIPT" --branch "$RELEASE_BRANCH" --commit "$FULL_SHA" \
    --release-project "$RELEASE_PROJECT" --image-repository "$IMAGE_REPOSITORY" \
    --staging-project "$STAGING_PROJECT" --staging-service "$STAGING_SERVICE" --region "$REGION" \
    --staging-data-boundary "$STAGING_DATA_BOUNDARY" --production-project "$PRODUCTION_PROJECT" \
    --production-service "$PRODUCTION_SERVICE" --production-data-boundary "$PRODUCTION_DATA_BOUNDARY" \
    --max-age-hours "$RECEIPT_MAX_AGE_HOURS"
}

run_readonly_verifier() {
  local command="$1" label="$2" target_project="$3" target_service="$4"
  [[ "$command" != NONE ]] || { pass "$label: no project-specific verifier configured"; return 0; }
  [[ ! "$command" =~ (builds[[:space:]]+submit|run[[:space:]]+(deploy|services[[:space:]]+update|services[[:space:]]+update-traffic)|firebase[[:space:]]+deploy|projects[[:space:]]+create|services[[:space:]]+enable|secrets[[:space:]]|iam[[:space:]]+service-accounts[[:space:]]+(create|add-iam-policy-binding)) ]] \
    || die "$label must be read-only; mutation command detected"
  RELEASE_PROJECT="$RELEASE_PROJECT" STAGING_PROJECT="$STAGING_PROJECT" PRODUCTION_PROJECT="$PRODUCTION_PROJECT" \
    BUILD_SERVICE_ACCOUNT="$BUILD_SERVICE_ACCOUNT" SOURCE_BUCKET="$SOURCE_BUCKET" STAGING_RUNTIME_IDENTITY="$STAGING_RUNTIME_IDENTITY" \
    PRODUCTION_RUNTIME_IDENTITY="$PRODUCTION_RUNTIME_IDENTITY" STAGING_SERVICE="$STAGING_SERVICE" \
    PRODUCTION_SERVICE="$PRODUCTION_SERVICE" TARGET_PROJECT="$target_project" \
    TARGET_SERVICE="$target_service" TARGET_REGION="$REGION" IMAGE_REPOSITORY="$IMAGE_REPOSITORY" bash -c "$command" \
    || die "$label failed"
  pass "$label passed"
}

common_preflight() {
  [[ -e .git && -f "$CLOUD_BUILD_CONFIG" && -d "$BUILD_WORKING_DIRECTORY" ]] || die "run from repository root with configured build paths present"
  local branch; branch="$(git branch --show-current)" || die "cannot read Git branch"
  [[ "$branch" == "$RELEASE_BRANCH" ]] || die "wrong branch: expected $RELEASE_BRANCH, observed $branch"
  local dirty; dirty="$(git status --porcelain)"
  [[ -z "$dirty" ]] || die "working tree must be clean before release:\n$dirty"
  git fetch --quiet origin "$RELEASE_BRANCH" || die "cannot fetch origin/$RELEASE_BRANCH"
  FULL_SHA="$(git rev-parse HEAD)"; local remote_sha; remote_sha="$(git rev-parse "origin/$RELEASE_BRANCH")"
  [[ "$FULL_SHA" =~ ^[0-9a-f]{40}$ && "$FULL_SHA" == "$remote_sha" ]] || die "HEAD must equal origin/$RELEASE_BRANCH before release"
  SHORT_SHA="${FULL_SHA:0:12}"

  local tool
  for tool in git bash curl gcloud; do command -v "$tool" >/dev/null 2>&1 || die "required tool missing: $tool"; done
  PYTHON_BIN="$(find_python)" || die "python3 or python is required for evidence receipts"
  [[ -f "$RECEIPT_TOOL" ]] || die "receipt helper missing: $RECEIPT_TOOL"
  local account; account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
  [[ -n "$account" ]] || die "gcloud has no active authenticated account"
  gcloud projects describe "$RELEASE_PROJECT" >/dev/null 2>&1 || die "cannot access release project $RELEASE_PROJECT"
  gcloud projects describe "$STAGING_PROJECT" >/dev/null 2>&1 || die "cannot access staging project $STAGING_PROJECT"
  gcloud projects describe "$PRODUCTION_PROJECT" >/dev/null 2>&1 || die "cannot access production project $PRODUCTION_PROJECT"
  local observed_identity
  observed_identity="$(gcloud run services describe "$STAGING_SERVICE" --region "$REGION" --project "$STAGING_PROJECT" --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"
  [[ "$observed_identity" == "$STAGING_RUNTIME_IDENTITY" ]] || die "staging service is missing or uses unexpected runtime identity '${observed_identity:-none}'; bootstrap it separately with explicit infrastructure approval"
  observed_identity="$(gcloud run services describe "$PRODUCTION_SERVICE" --region "$REGION" --project "$PRODUCTION_PROJECT" --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"
  [[ "$observed_identity" == "$PRODUCTION_RUNTIME_IDENTITY" ]] || die "production service is missing or uses unexpected runtime identity '${observed_identity:-none}'"
  gcloud iam service-accounts describe "$BUILD_SERVICE_ACCOUNT" --project "$RELEASE_PROJECT" >/dev/null 2>&1 \
    || die "dedicated build service account is missing or inaccessible"
  local source_bucket_name="${SOURCE_BUCKET#gs://}"
  source_bucket_name="${source_bucket_name%%/*}"
  local source_bucket_root="gs://$source_bucket_name"
  gcloud storage buckets describe "$source_bucket_root" --project "$RELEASE_PROJECT" >/dev/null 2>&1 \
    || die "dedicated Cloud Build source bucket is missing or inaccessible"
  run_readonly_verifier "$ISOLATION_VERIFY_COMMAND" "build/runtime/data isolation verification" "$STAGING_PROJECT" "$STAGING_SERVICE"

  local artifact_location="${IMAGE_REPOSITORY%%-docker.pkg.dev/*}"
  local after_host artifact_project after_project artifact_repo
  after_host="${IMAGE_REPOSITORY#*/}"
  artifact_project="${after_host%%/*}"
  after_project="${after_host#*/}"
  artifact_repo="${after_project%%/*}"
  [[ "$artifact_project" == "$RELEASE_PROJECT" && "$after_project" != "$after_host" && "$artifact_repo" != "$after_project" ]] \
    || die "IMAGE_REPOSITORY must be LOCATION-docker.pkg.dev/$RELEASE_PROJECT/REPOSITORY/IMAGE"
  gcloud artifacts repositories describe "$artifact_repo" --location "$artifact_location" --project "$RELEASE_PROJECT" >/dev/null 2>&1 || die "Artifact Registry repository does not exist or is inaccessible"
  git check-ignore -q "$STAGING_RECEIPT" || die "STAGING_RECEIPT must be ignored by Git"
  git check-ignore -q "$PROMOTION_RECEIPT" || die "PROMOTION_RECEIPT must be ignored by Git"
  PROFILE_HASH="$("$PYTHON_BIN" "$RECEIPT_TOOL" hash-profile --file "$CONFIG_PATH")" || die "cannot hash the staged-release profile"
  RUNTIME_CONFIG_HASH="$("$PYTHON_BIN" "$RECEIPT_TOOL" hash-files --root "$PWD" --files "$RUNTIME_CONFIG_FILES")" || die "cannot hash runtime configuration inputs"
  RULES_HASH="$("$PYTHON_BIN" "$RECEIPT_TOOL" hash-files --root "$PWD" --files "$RULES_FILE")" || die "cannot hash rules input"
  [[ "$PROFILE_HASH" =~ ^sha256:[0-9a-f]{64}$ && "$RUNTIME_CONFIG_HASH" =~ ^sha256:[0-9a-f]{64}$ && ( "$RULES_HASH" == NONE || "$RULES_HASH" =~ ^sha256:[0-9a-f]{64}$ ) ]] || die "release input hashes are malformed"
  pass "preflight: branch, remote parity, project isolation, services, registry and ignored evidence paths"
}

stage_preflight() {
  common_preflight
  if grep -Eiq 'gcloud[[:space:]].*run|firebase[[:space:]]+deploy|services[[:space:]]+enable|projects[[:space:]]+create|secrets[[:space:]]|iam[[:space:]]' "$CLOUD_BUILD_CONFIG"; then
    die "CLOUD_BUILD_CONFIG must build and push only; the dedicated build identity is the enforcement boundary"
  fi
  run_readonly_verifier "$STAGING_PREREQUISITE_VERIFY_COMMAND" "staging prerequisite verification" "$STAGING_PROJECT" "$STAGING_SERVICE"
  info "build command: (cd '$BUILD_WORKING_DIRECTORY' && $BUILD_COMMAND)"
  (cd "$BUILD_WORKING_DIRECTORY" && bash -c "$BUILD_COMMAND") || die "project build failed"
  [[ -z "$(git status --porcelain)" ]] || die "project build changed the release tree"
  pass "project build passed and left the release tree clean"
}

gate() {
  local expected="$1" label="$2"
  echo "================= $label GATE ================="
  echo "Commit       : $FULL_SHA"
  if [[ -n "$IMAGE_DIGEST" ]]; then
    echo "Build ID     : $BUILD_ID"
    echo "Image        : $IMAGE_REPOSITORY@$IMAGE_DIGEST"
    echo "Staging rev  : $STAGING_REVISION"
  else
    echo "Image tag    : $IMAGE_REPOSITORY:$FULL_SHA (digest resolved after build)"
  fi
  echo "Staging      : $STAGING_PROJECT / $STAGING_SERVICE"
  echo "Production   : $PRODUCTION_PROJECT / $PRODUCTION_SERVICE"
  echo "Data boundary: $STAGING_DATA_BOUNDARY != $PRODUCTION_DATA_BOUNDARY"
  echo "================================================"
  if [[ "$DRY_RUN" -eq 1 ]]; then echo "DRY-RUN: no cloud mutation performed."; return 1; fi
  local reply=""; echo "Type $expected to proceed, anything else to abort:"
  IFS= read -r reply || true; reply="${reply%$'\r'}"
  [[ "$reply" == "$expected" ]] || die "$label gate declined; expected exact token $expected"
}

build_image() {
  local rows status="" attempts=0
  rows="$(gcloud builds list --project "$RELEASE_PROJECT" --filter="substitutions.COMMIT_SHA=$FULL_SHA AND status=(QUEUED,WORKING,SUCCESS)" --format='value(id,status)' --limit=10)" \
    || die "cannot reconcile prior builds for the exact commit"
  mapfile -t existing_builds < <(printf '%s\n' "$rows" | sed '/^[[:space:]]*$/d')
  [[ "${#existing_builds[@]}" -le 1 ]] || die "multiple active/successful builds exist for $FULL_SHA; reconcile manually"
  if [[ "${#existing_builds[@]}" -eq 1 ]]; then
    IFS=$'\t' read -r BUILD_ID status <<<"${existing_builds[0]}"
    [[ "$BUILD_ID" =~ ^[0-9a-f-]{36}$ && "$status" =~ ^(QUEUED|WORKING|SUCCESS)$ ]] \
      || die "existing build lookup returned malformed data"
    info "resuming exact Cloud Build $BUILD_ID in state $status"
  else
    info "submitting one asynchronous build-only Cloud Build with the dedicated build identity"
    BUILD_ID="$(gcloud builds submit --config "$CLOUD_BUILD_CONFIG" --project "$RELEASE_PROJECT" \
      --gcs-source-staging-dir="$SOURCE_BUCKET" \
      --service-account="projects/$RELEASE_PROJECT/serviceAccounts/$BUILD_SERVICE_ACCOUNT" \
      --substitutions="COMMIT_SHA=$FULL_SHA" --async --format='value(id)')" || die "Cloud Build submission failed"
    [[ "$BUILD_ID" =~ ^[0-9a-f-]{36}$ ]] || die "Cloud Build submission did not return an exact Build ID"
  fi
  while [[ "$attempts" -lt 180 ]]; do
    status="$(gcloud builds describe "$BUILD_ID" --project "$RELEASE_PROJECT" --format='value(status)' 2>/dev/null || true)"
    case "$status" in
      SUCCESS) break ;;
      FAILURE|INTERNAL_ERROR|TIMEOUT|CANCELLED|EXPIRED) die "Cloud Build $BUILD_ID ended with status $status" ;;
    esac
    attempts=$((attempts + 1)); sleep 5
  done
  [[ "$status" == SUCCESS ]] || die "Cloud Build $BUILD_ID did not finish within 15 minutes; reconcile it by exact Build ID before retrying"
  IMAGE_DIGEST="$(gcloud builds describe "$BUILD_ID" --project "$RELEASE_PROJECT" --format=json \
    | "$PYTHON_BIN" "$RECEIPT_TOOL" build-digest --build-id "$BUILD_ID" --commit "$FULL_SHA" \
      --image-repository "$IMAGE_REPOSITORY" --release-project "$RELEASE_PROJECT" \
      --build-service-account "$BUILD_SERVICE_ACCOUNT")" || die "exact Cloud Build result validation failed"
  [[ "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || die "exact Cloud Build resource did not prove an immutable image digest"
  pass "built once: $BUILD_ID / $IMAGE_REPOSITORY@$IMAGE_DIGEST"
}

service_url() {
  local project="$1" service="$2" configured="$3" url
  if [[ "$configured" != AUTO ]]; then echo "$configured"; return; fi
  url="$(gcloud run services describe "$service" --region "$REGION" --project "$project" --format='value(status.url)' 2>/dev/null || true)"
  [[ "$url" =~ ^https://[^[:space:]/]+$ ]] || die "cannot resolve Cloud Run URL for $project/$service"
  echo "$url"
}

revision_image() {
  gcloud run revisions describe "$1" --region "$REGION" --project "$2" --format='value(spec.containers[0].image)' 2>/dev/null || true
}

revision_runtime_state() {
  local revision="$1" project="$2" identity="$3"
  gcloud run revisions describe "$revision" --region "$REGION" --project "$project" --format=json \
    | "$PYTHON_BIN" "$RECEIPT_TOOL" revision-state --service-account "$identity" \
      --image-repository "$IMAGE_REPOSITORY" --digest "$IMAGE_DIGEST"
}

service_state() {
  local project="$1" service="$2" revision="$3" tag="$4" require_tag="$5"
  local args=(traffic-state --revision "$revision" --tag "$tag")
  [[ "$require_tag" == true ]] && args+=(--require-tag)
  gcloud run services describe "$service" --region "$REGION" --project "$project" --format=json \
    | "$PYTHON_BIN" "$RECEIPT_TOOL" "${args[@]}"
}

TARGET_REVISION=""
TARGET_TAG=""
TARGET_TAG_URL=""
ensure_candidate_revision() {
  local project="$1" service="$2" label="$3" completed_traffic="$4"
  TARGET_REVISION="$service-$SHORT_SHA"
  TARGET_TAG="candidate-$SHORT_SHA"
  local image state observed_percent
  image="$(revision_image "$TARGET_REVISION" "$project")"
  if [[ -z "$image" ]]; then
    gcloud run deploy "$service" --image="$IMAGE_REPOSITORY@$IMAGE_DIGEST" --revision-suffix="$SHORT_SHA" --no-traffic --tag="$TARGET_TAG" --region "$REGION" --project "$project" --quiet >/dev/null || die "$label no-traffic candidate deployment failed"
    image="$(revision_image "$TARGET_REVISION" "$project")"
  fi
  [[ "$image" == *"@$IMAGE_DIGEST" ]] || die "$label exact revision $TARGET_REVISION does not use the verified digest"
  state="$(service_state "$project" "$service" "$TARGET_REVISION" "$TARGET_TAG" true)" || die "$label candidate tag state is not authoritative"
  IFS=$'\t' read -r observed_percent TARGET_TAG_URL <<<"$state"
  [[ "${observed_percent:-0}" == 0 || "$observed_percent" == "$completed_traffic" ]] \
    || die "$label candidate has unexpected traffic $observed_percent%; expected 0% or reconciled $completed_traffic%"
  TARGET_TRAFFIC="$observed_percent"
  [[ "$TARGET_TAG_URL" =~ ^https://[^[:space:]/]+$ ]] || die "$label tagged candidate URL is unavailable"
  pass "$label candidate: exact digest, deterministic revision and tag at $TARGET_TRAFFIC% traffic"
}

smoke_candidate() {
  local label="$1" code
  code="$(run_route_curl -o /dev/null -w '%{http_code}' "$TARGET_TAG_URL$HEALTH_ROUTE")" || die "$label tagged candidate is unavailable"
  [[ "$code" == 200 ]] || die "$label tagged candidate returned HTTP $code"
  pass "$label tagged no-traffic candidate smoke passed"
}

route_exact_revision() {
  local project="$1" service="$2" revision="$3" percent="$4" label="$5"
  gcloud run services update-traffic "$service" --to-revisions="$revision=$percent" --region "$REGION" --project "$project" --quiet >/dev/null || die "$label exact-revision traffic update failed"
}

verify_service() {
  local project="$1" service="$2" revision="$3" expected_traffic="$4" url="$5" label="$6"
  local image state traffic_pct code
  image="$(revision_image "$revision" "$project")"
  [[ "$image" == *"@$IMAGE_DIGEST" ]] || die "$label exact revision does not use the verified image digest"
  state="$(service_state "$project" "$service" "$revision" "unused" false)" || die "$label traffic state is invalid"
  IFS=$'\t' read -r traffic_pct _ <<<"$state"
  [[ "$traffic_pct" == "$expected_traffic" ]] || die "$label exact revision has $traffic_pct% traffic; expected $expected_traffic%"
  code="$(run_route_curl -o /dev/null -w '%{http_code}' "$url$HEALTH_ROUTE")" || die "$label health route is unavailable"
  [[ "$code" == 200 ]] || die "$label health route returned HTTP $code"
  if [[ "$label" == staging ]]; then STAGING_REVISION="$revision"; STAGING_TRAFFIC="$traffic_pct"; else PRODUCTION_REVISION="$revision"; PRODUCTION_TRAFFIC="$traffic_pct"; fi
  pass "$label: digest, traffic and HTTP health verification passed"
}

verify_staging_tests() {
  local target_url="$1"
  TARGET_URL="$target_url" TARGET_PROJECT="$STAGING_PROJECT" TARGET_SERVICE="$STAGING_SERVICE" TARGET_REGION="$REGION" RELEASE_COMMIT="$FULL_SHA" IMAGE_DIGEST="$IMAGE_DIGEST" bash -c "$STAGING_VERIFY_COMMAND" || die "staging verification command failed"
  pass "staging project verification command passed"
}

receipt_base_args=()
set_receipt_args() {
  receipt_base_args=(--file "$STAGING_RECEIPT" --branch "$RELEASE_BRANCH" --commit "$FULL_SHA" \
    --release-project "$RELEASE_PROJECT" --build-service-account "$BUILD_SERVICE_ACCOUNT" \
    --image-repository "$IMAGE_REPOSITORY" --staging-project "$STAGING_PROJECT" \
    --staging-service "$STAGING_SERVICE" --staging-runtime-identity "$STAGING_RUNTIME_IDENTITY" \
    --expected-staging-revision "$STAGING_SERVICE-$SHORT_SHA" --expected-staging-tag "candidate-$SHORT_SHA" \
    --expected-staging-traffic "$EXPECTED_STAGING_TRAFFIC_PERCENT" --region "$REGION" \
    --staging-data-boundary "$STAGING_DATA_BOUNDARY" --production-project "$PRODUCTION_PROJECT" \
    --production-service "$PRODUCTION_SERVICE" --production-runtime-identity "$PRODUCTION_RUNTIME_IDENTITY" \
    --production-data-boundary "$PRODUCTION_DATA_BOUNDARY" --max-age-hours "$RECEIPT_MAX_AGE_HOURS" \
    --profile-hash "$PROFILE_HASH" --runtime-config-hash "$RUNTIME_CONFIG_HASH" --rules-hash "$RULES_HASH")
}

validate_receipt() {
  set_receipt_args
  local receipt_result
  receipt_result="$("$PYTHON_BIN" "$RECEIPT_TOOL" validate "${receipt_base_args[@]}")" || die "staging receipt validation failed"
  IFS=$'\t' read -r IMAGE_DIGEST BUILD_ID STAGING_REVISION STAGING_URL STAGING_TAG_URL STAGING_RUNTIME_STATE_HASH <<<"$receipt_result"
  [[ "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || die "receipt validation did not return a digest"
  local authoritative_digest
  authoritative_digest="$(gcloud builds describe "$BUILD_ID" --project "$RELEASE_PROJECT" --format=json \
    | "$PYTHON_BIN" "$RECEIPT_TOOL" build-digest --build-id "$BUILD_ID" --commit "$FULL_SHA" \
      --image-repository "$IMAGE_REPOSITORY" --release-project "$RELEASE_PROJECT" \
      --build-service-account "$BUILD_SERVICE_ACCOUNT")" || die "exact staged Build ID cannot be revalidated"
  [[ "$authoritative_digest" == "$IMAGE_DIGEST" ]] || die "receipt digest differs from the exact Cloud Build result"
  STAGING_TAG="candidate-$SHORT_SHA"
}

revalidate_staging_receipt() {
  local authoritative_service_url state traffic tag_url runtime_hash
  authoritative_service_url="$(service_url "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_DOMAIN")"
  [[ "$authoritative_service_url" == "$STAGING_URL" ]] || die "staging service URL differs from the receipt"
  verify_service "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$EXPECTED_STAGING_TRAFFIC_PERCENT" "$authoritative_service_url" staging
  state="$(service_state "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$STAGING_TAG" true)" \
    || die "staging exact tag state is not authoritative"
  IFS=$'\t' read -r traffic tag_url <<<"$state"
  [[ "$traffic" == "$EXPECTED_STAGING_TRAFFIC_PERCENT" ]] || die "staging tagged revision traffic differs from the receipt"
  [[ "$tag_url" == "$STAGING_TAG_URL" ]] || die "staging tagged URL differs from the receipt"
  runtime_hash="$(revision_runtime_state "$STAGING_REVISION" "$STAGING_PROJECT" "$STAGING_RUNTIME_IDENTITY")" \
    || die "staging exact revision runtime state is invalid"
  [[ "$runtime_hash" == "$STAGING_RUNTIME_STATE_HASH" ]] || die "staging exact revision runtime configuration differs from the receipt"
  verify_staging_tests "$authoritative_service_url"
  verify_service "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$EXPECTED_STAGING_TRAFFIC_PERCENT" "$authoritative_service_url" staging
}

write_stage_receipt() {
  set_receipt_args
  "$PYTHON_BIN" "$RECEIPT_TOOL" stage "${receipt_base_args[@]}" --build-id "$BUILD_ID" --digest "$IMAGE_DIGEST" \
    --staging-revision "$STAGING_REVISION" --staging-tag "$STAGING_TAG" --staging-service-url "$STAGING_URL" \
    --staging-tag-url "$STAGING_TAG_URL" --staging-traffic "$STAGING_TRAFFIC" \
    --staging-runtime-state-hash "$STAGING_RUNTIME_STATE_HASH"
  pass "staging evidence receipt: $STAGING_RECEIPT"
}

write_promotion_receipt() {
  set_receipt_args
  "$PYTHON_BIN" "$RECEIPT_TOOL" promotion "${receipt_base_args[@]}" --output "$PROMOTION_RECEIPT" \
    --production-revision "$PRODUCTION_REVISION" --production-tag "$PRODUCTION_TAG" \
    --production-service-url "$PRODUCTION_URL" --production-tag-url "$PRODUCTION_TAG_URL" \
    --production-traffic "$PRODUCTION_TRAFFIC" --production-runtime-state-hash "$PRODUCTION_RUNTIME_STATE_HASH"
  pass "promotion evidence receipt: $PROMOTION_RECEIPT"
}

case "$MODE" in
  --check)
    stage_preflight
    run_readonly_verifier "$PRODUCTION_PREREQUISITE_VERIFY_COMMAND" "production prerequisite verification" "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE"
    echo "CHECK: PASS — isolated staging prerequisites exist; nothing was deployed."
    ;;
  --stage)
    stage_preflight
    if [[ -f "$STAGING_RECEIPT" ]]; then
      validate_receipt
      revalidate_staging_receipt
      echo "STAGE: PASS — reconciled immutable existing receipt; production touched: false"
      exit 0
    fi
    if ! gate STAGE "NON-PRODUCTION STAGING"; then exit 0; fi
    build_image
    ensure_candidate_revision "$STAGING_PROJECT" "$STAGING_SERVICE" staging "$EXPECTED_STAGING_TRAFFIC_PERCENT"
    STAGING_REVISION="$TARGET_REVISION"
    STAGING_TAG="$TARGET_TAG"
    STAGING_TAG_URL="$TARGET_TAG_URL"
    smoke_candidate staging
    if [[ "$TARGET_TRAFFIC" == 0 ]]; then
      route_exact_revision "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$EXPECTED_STAGING_TRAFFIC_PERCENT" staging
    fi
    STAGING_URL="$(service_url "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_DOMAIN")"
    verify_service "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$EXPECTED_STAGING_TRAFFIC_PERCENT" "$STAGING_URL" staging
    STAGING_RUNTIME_STATE_HASH="$(revision_runtime_state "$STAGING_REVISION" "$STAGING_PROJECT" "$STAGING_RUNTIME_IDENTITY")" \
      || die "staging exact revision runtime state could not be bound"
    verify_staging_tests "$STAGING_URL"
    verify_service "$STAGING_PROJECT" "$STAGING_SERVICE" "$STAGING_REVISION" "$EXPECTED_STAGING_TRAFFIC_PERCENT" "$STAGING_URL" staging
    write_stage_receipt
    echo "STAGE: PASS — production touched: false"
    ;;
  --verify-stage)
    common_preflight
    validate_receipt
    revalidate_staging_receipt
    echo "STAGE VERIFY: PASS — production touched: false"
    ;;
  --promote)
    common_preflight
    validate_receipt
    revalidate_staging_receipt
    run_readonly_verifier "$PRODUCTION_PREREQUISITE_VERIFY_COMMAND" "production prerequisite verification" "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE"
    [[ ! -f "$PROMOTION_RECEIPT" ]] || die "immutable promotion receipt already exists; reconcile it instead of promoting again"
    if ! gate DEPLOY "PRODUCTION EXACT-IMAGE PROMOTION"; then exit 0; fi
    validate_receipt
    revalidate_staging_receipt
    ensure_candidate_revision "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE" production "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT"
    PRODUCTION_REVISION="$TARGET_REVISION"
    PRODUCTION_TAG="$TARGET_TAG"
    PRODUCTION_TAG_URL="$TARGET_TAG_URL"
    smoke_candidate production
    if [[ "$TARGET_TRAFFIC" == 0 ]]; then
      route_exact_revision "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE" "$PRODUCTION_REVISION" "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT" production
    fi
    PRODUCTION_URL="$(service_url "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE" "$PRODUCTION_DOMAIN")"
    verify_service "$PRODUCTION_PROJECT" "$PRODUCTION_SERVICE" "$PRODUCTION_REVISION" "$EXPECTED_PRODUCTION_TRAFFIC_PERCENT" "$PRODUCTION_URL" production
    PRODUCTION_RUNTIME_STATE_HASH="$(revision_runtime_state "$PRODUCTION_REVISION" "$PRODUCTION_PROJECT" "$PRODUCTION_RUNTIME_IDENTITY")" \
      || die "production exact revision runtime state could not be bound"
    write_promotion_receipt
    echo "PROMOTION: PASS — rebuilt: false / digest: $IMAGE_DIGEST"
    ;;
esac
