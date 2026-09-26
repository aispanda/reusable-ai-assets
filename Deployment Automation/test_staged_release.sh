#!/usr/bin/env bash
set -euo pipefail

if [[ -d /usr/bin ]]; then export PATH="$PATH:/usr/bin:/bin"; fi

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTROLLER="$TOOLKIT_DIR/staged_release.sh"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/staged-release-test.XXXXXX")"
cleanup() {
  local rc=$?
  if [[ "${KEEP_STAGED_TEST:-0}" == 1 || "$rc" -ne 0 ]]; then echo "KEPT: $TEST_ROOT"; return; fi
  [[ -d "${TEST_ROOT:-}" && "$TEST_ROOT" == *staged-release-test.* ]] && rm -rf -- "$TEST_ROOT"
}
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

bash -n "$CONTROLLER"
STAGED_RELEASE_CONFIG= bash "$CONTROLLER" --help >/dev/null

BIN="$TEST_ROOT/bin"
REPO="$TEST_ROOT/repo"
ORIGIN="$TEST_ROOT/origin.git"
STATE="$TEST_ROOT/state"
CALLS="$TEST_ROOT/calls.log"
CONFIG="$TEST_ROOT/staged.config"
mkdir -p "$BIN" "$REPO/app" "$REPO/server" "$STATE"
: > "$CALLS"

cat > "$BIN/build-ok" <<'STUB'
#!/usr/bin/env bash
echo "build-ok $*" >> "${STUB_CALLS_LOG:?}"
mkdir -p dist
printf '<html>ok</html>\n' > dist/index.html
STUB

cat > "$BIN/prereq-ok" <<'STUB'
#!/usr/bin/env bash
echo "prereq-ok project=${TARGET_PROJECT:?} service=${TARGET_SERVICE:?}" >> "${STUB_CALLS_LOG:?}"
STUB

cat > "$BIN/isolation-ok" <<'STUB'
#!/usr/bin/env bash
echo "isolation-ok build=${BUILD_SERVICE_ACCOUNT:?} stage=${STAGING_RUNTIME_IDENTITY:?} prod=${PRODUCTION_RUNTIME_IDENTITY:?}" >> "${STUB_CALLS_LOG:?}"
STUB

cat > "$BIN/verify-ok" <<'STUB'
#!/usr/bin/env bash
echo "verify-ok url=${TARGET_URL:?} project=${TARGET_PROJECT:?} digest=${IMAGE_DIGEST:?}" >> "${STUB_CALLS_LOG:?}"
STUB

cat > "$BIN/curl" <<'STUB'
#!/usr/bin/env bash
echo "curl $*" >> "${STUB_CALLS_LOG:?}"
printf '200'
STUB
cp "$BIN/curl" "$BIN/curl.exe"

cat > "$BIN/gcloud" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
args="$*"
echo "gcloud $args" >> "${STUB_CALLS_LOG:?}"

arg_value() {
  local wanted="$1" previous="" item
  shift
  for item in "$@"; do
    if [[ "$previous" == "$wanted" ]]; then echo "$item"; return; fi
    [[ "$item" == "$wanted="* ]] && { echo "${item#*=}"; return; }
    previous="$item"
  done
}

project="$(arg_value --project "$@" || true)"
service=""
if [[ "${1:-}" == run && "${2:-}" == deploy ]]; then service="${3:-}"; fi
if [[ "${1:-}" == run && "${2:-}" == services && "${3:-}" == describe ]]; then service="${4:-}"; fi
if [[ "${1:-}" == run && "${2:-}" == services && "${3:-}" == update-traffic ]]; then service="${4:-}"; fi
state_file="${STUB_STATE_DIR:?}/${project}-${service}.state"

case "$args" in
  "auth list"*) echo "tester@example.invalid" ;;
  projects\ describe*) echo "${project:-project}" ;;
  artifacts\ repositories\ describe*) [[ "${4:-}" == repo ]] || exit 10; echo "repo" ;;
  storage\ buckets\ describe*) echo "source-bucket" ;;
  iam\ service-accounts\ describe*) echo "build-identity" ;;
  builds\ list*) [[ -f "${STUB_STATE_DIR:?}/build-submitted" ]] && printf '%s\tSUCCESS\n' "${TEST_BUILD_ID:?}" || : ;;
  builds\ submit*) touch "${STUB_STATE_DIR:?}/build-submitted"; echo "${TEST_BUILD_ID:?}" ;;
  builds\ describe*"value(status)"*) echo "SUCCESS" ;;
  builds\ describe*"format=json"*)
    cat <<JSON
{"id":"${TEST_BUILD_ID:?}","status":"SUCCESS","serviceAccount":"projects/release-project-123/serviceAccounts/${BUILD_IDENTITY:?}","substitutions":{"COMMIT_SHA":"${EXPECTED_SHA:?}"},"results":{"images":[{"name":"${TEST_IMAGE:?}:${EXPECTED_SHA:?}","digest":"${EXPECTED_DIGEST:?}"}]}}
JSON
    ;;
  run\ services\ describe*)
    if [[ "$args" == *"serviceAccountName"* ]]; then
      if [[ "$project" == "${STAGE_PROJECT:?}" ]]; then echo "${STAGE_IDENTITY:?}"; else echo "${PROD_IDENTITY:?}"; fi
    elif [[ "$args" == *"value(status.url)"* ]]; then
      if [[ "$project" == "${STAGE_PROJECT:?}" ]]; then echo "https://stage.example.test"; else echo "https://prod.example.test"; fi
    elif [[ "$args" == *"format=json"* ]]; then
      if [[ -f "$state_file" ]]; then
        IFS='|' read -r revision digest traffic tag url < "$state_file"
        printf '{"status":{"traffic":[{"revisionName":"old","percent":%s},{"revisionName":"%s","percent":%s,"tag":"%s","url":"%s"}]}}\n' "$((100-traffic))" "$revision" "$traffic" "$tag" "$url"
      else
        printf '{"status":{"traffic":[{"revisionName":"old","percent":100}]}}\n'
      fi
    else echo "service"; fi
    ;;
  run\ revisions\ describe*)
    revision="${4:-}"
    for candidate in "${STUB_STATE_DIR:?}/${project}-"*.state; do
      [[ -f "$candidate" ]] || continue
      IFS='|' read -r recorded digest _ < "$candidate"
      if [[ "$revision" == "$recorded" ]]; then
        if [[ "$args" == *"format=json"* ]]; then
          if [[ "$project" == "${STAGE_PROJECT:?}" ]]; then identity="${STAGE_IDENTITY:?}"; else identity="${PROD_IDENTITY:?}"; fi
          printf '{"spec":{"serviceAccountName":"%s","containers":[{"image":"%s@%s","env":[{"name":"RUNTIME_ENVIRONMENT","value":"fixture"}]}]}}\n' "$identity" "${TEST_IMAGE:?}" "$digest"
        else
          echo "${TEST_IMAGE:?}@$digest"
        fi
        exit 0
      fi
    done
    exit 1
    ;;
  run\ deploy*)
    [[ "$args" == *"--no-traffic"* ]] || { echo "missing --no-traffic" >&2; exit 8; }
    [[ "$args" == *"${TEST_IMAGE:?}@${EXPECTED_DIGEST:?}"* ]] || { echo "mutable image" >&2; exit 8; }
    suffix="$(arg_value --revision-suffix "$@")"
    tag="$(arg_value --tag "$@")"
    revision="$service-$suffix"
    url="https://${tag}---${service}.example.test"
    printf '%s|%s|0|%s|%s\n' "$revision" "${EXPECTED_DIGEST:?}" "$tag" "$url" > "$state_file"
    ;;
  run\ services\ update-traffic*)
    target="$(arg_value --to-revisions "$@")"
    revision="${target%=*}"; traffic="${target#*=}"
    IFS='|' read -r recorded digest _ tag url < "$state_file"
    [[ "$revision" == "$recorded" ]] || exit 9
    printf '%s|%s|%s|%s|%s\n' "$recorded" "$digest" "$traffic" "$tag" "$url" > "$state_file"
    ;;
  *) echo "unhandled gcloud call: $args" >&2; exit 7 ;;
esac
STUB

chmod +x "$BIN"/*
printf 'runtime\n' > "$REPO/server/runtime-config.js"
printf 'rules_version = "2";\n' > "$REPO/firestore.rules"
printf 'steps: []\nimages: []\n' > "$REPO/cloudbuild.image.yaml"
printf 'placeholder\n' > "$REPO/app/placeholder.txt"
printf 'app/dist/\n.release-evidence/\n' > "$REPO/.gitignore"
git -C "$REPO" init --initial-branch=main --quiet
git -C "$REPO" config user.name "Staged Release Test"
git -C "$REPO" config user.email "test@example.invalid"
git -C "$REPO" add -- .
git -C "$REPO" commit --quiet -m fixture
git init --bare --quiet "$ORIGIN"
git -C "$REPO" remote add origin "$ORIGIN"
git -C "$REPO" push --quiet -u origin main

GSA_SUFFIX='iam.gserviceaccount.com'
export STAGE_IDENTITY="fixture-stage@stage-project-123.${GSA_SUFFIX}"
export PROD_IDENTITY="fixture-prod@prod-project-123.${GSA_SUFFIX}"
export BUILD_IDENTITY="fixture-build@release-project-123.${GSA_SUFFIX}"

cat > "$CONFIG" <<'CONFIG'
RELEASE_PROJECT=release-project-123
STAGING_PROJECT=stage-project-123
PRODUCTION_PROJECT=prod-project-123
STAGING_SERVICE=sample-web-stage
PRODUCTION_SERVICE=sample-web
STAGING_RUNTIME_IDENTITY=__STAGE_IDENTITY__
PRODUCTION_RUNTIME_IDENTITY=__PROD_IDENTITY__
BUILD_SERVICE_ACCOUNT=__BUILD_IDENTITY__
SOURCE_BUCKET=gs://release-project-123-build-source/source
REGION=us-east1
RELEASE_BRANCH=main
STAGING_DOMAIN=https://stage.example.test
PRODUCTION_DOMAIN=https://prod.example.test
BUILD_WORKING_DIRECTORY=app
BUILD_COMMAND=build-ok
CLOUD_BUILD_CONFIG=cloudbuild.image.yaml
IMAGE_REPOSITORY=us-east1-docker.pkg.dev/release-project-123/repo/sample-web
ISOLATION_VERIFY_COMMAND=isolation-ok
STAGING_PREREQUISITE_VERIFY_COMMAND=prereq-ok
PRODUCTION_PREREQUISITE_VERIFY_COMMAND=prereq-ok
STAGING_VERIFY_COMMAND=verify-ok
RUNTIME_CONFIG_FILES=server/runtime-config.js,cloudbuild.image.yaml
RULES_FILE=firestore.rules
HEALTH_ROUTE=/health
STAGING_DATA_BOUNDARY=project:stage-project-123/firestore:(default)
PRODUCTION_DATA_BOUNDARY=project:prod-project-123/firestore:(default)
STAGING_RECEIPT=.release-evidence/staging.json
PROMOTION_RECEIPT=.release-evidence/production.json
EXPECTED_STAGING_TRAFFIC_PERCENT=100
EXPECTED_PRODUCTION_TRAFFIC_PERCENT=100
RECEIPT_MAX_AGE_HOURS=72
CONFIG
sed -i "s|__STAGE_IDENTITY__|$STAGE_IDENTITY|; s|__PROD_IDENTITY__|$PROD_IDENTITY|; s|__BUILD_IDENTITY__|$BUILD_IDENTITY|" "$CONFIG"

export PATH="$BIN:$PATH"
export STUB_CALLS_LOG="$CALLS"
export STUB_STATE_DIR="$STATE"
export STAGE_PROJECT=stage-project-123
export TEST_BUILD_ID=11111111-1111-1111-1111-111111111111
export EXPECTED_SHA="$(git -C "$REPO" rev-parse HEAD)"
export EXPECTED_DIGEST="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
export TEST_IMAGE=us-east1-docker.pkg.dev/release-project-123/repo/sample-web

run_release() {
  (cd "$REPO" && STAGED_RELEASE_CONFIG="$CONFIG" STAGED_RELEASE_PYTHON="${STAGED_RELEASE_PYTHON:?}" bash "$CONTROLLER" "$@")
}

run_release --check > "$TEST_ROOT/check.log" 2>&1
grep -Fq "CHECK: PASS" "$TEST_ROOT/check.log" || fail "valid isolated profile did not pass"
! grep -Eq 'builds submit|run deploy|update-traffic' "$CALLS" || fail "check mode mutated cloud state"
pass "isolated preflight is read-only"

BAD_CONFIG="$TEST_ROOT/bad.config"
sed 's/^STAGING_PROJECT=.*/STAGING_PROJECT=prod-project-123/' "$CONFIG" > "$BAD_CONFIG"
if (cd "$REPO" && STAGED_RELEASE_CONFIG="$BAD_CONFIG" bash "$CONTROLLER" --check) > "$TEST_ROOT/bad.log" 2>&1; then
  fail "same staging and production project was accepted"
fi
grep -Fq "three different Google Cloud projects" "$TEST_ROOT/bad.log" || fail "isolation failure was unclear"
pass "same-project staging rejected"

BAD_RELEASE_CONFIG="$TEST_ROOT/bad-release.config"
sed 's/^RELEASE_PROJECT=.*/RELEASE_PROJECT=prod-project-123/' "$CONFIG" > "$BAD_RELEASE_CONFIG"
if (cd "$REPO" && STAGED_RELEASE_CONFIG="$BAD_RELEASE_CONFIG" bash "$CONTROLLER" --check) > "$TEST_ROOT/bad-release.log" 2>&1; then
  fail "production project was accepted as the release/build project"
fi
grep -Fq "three different Google Cloud projects" "$TEST_ROOT/bad-release.log" || fail "release-project isolation failure was unclear"
pass "production project rejected as release/build project"

: > "$CALLS"
run_release --candidate --dry-run > "$TEST_ROOT/candidate-dry.log" 2>&1
! grep -Eq 'builds submit|run deploy|update-traffic' "$CALLS" || fail "candidate dry-run mutated external state"
pass "candidate dry-run stops before mutation"

: > "$CALLS"
printf 'CANDIDATE\n' | run_release --candidate > "$TEST_ROOT/candidate.log" 2>&1
grep -Fq "CANDIDATE: AVAILABLE" "$TEST_ROOT/candidate.log" || fail "candidate was not handed over"
grep -Fq "Candidate URL : https://candidate-${EXPECTED_SHA:0:12}---sample-web-stage.example.test" "$TEST_ROOT/candidate.log" || fail "candidate URL was not reported"
grep -Fq "Visual Studio : https://candidate-${EXPECTED_SHA:0:12}---sample-web-stage.example.test/studio (sign-in and publishing unavailable" "$TEST_ROOT/candidate.log" || fail "candidate visual Studio URL was not reported safely"
grep -Fq "Commit        : $EXPECTED_SHA" "$TEST_ROOT/candidate.log" || fail "candidate commit was not reported"
grep -Fq "Manual scope  : visual/UI review only" "$TEST_ROOT/candidate.log" || fail "candidate handoff did not limit the manual review scope"
grep -Fq "Next approval : STAGE routes this exact candidate" "$TEST_ROOT/candidate.log" || fail "candidate handoff did not explain the next approval"
[[ ! -f "$REPO/.release-evidence/staging.json" ]] || fail "candidate created a promotion-ready receipt"
[[ "$(grep -c 'gcloud builds submit' "$CALLS")" -eq 1 ]] || fail "candidate did not submit exactly one build"
grep -Fq -- "--service-account=projects/release-project-123/serviceAccounts/$BUILD_IDENTITY" "$CALLS" || fail "candidate did not use the dedicated build identity"
grep -Fq -- "--gcs-source-staging-dir=gs://release-project-123-build-source/source" "$CALLS" || fail "candidate did not use the dedicated source bucket"
grep -Fq "run deploy sample-web-stage" "$CALLS" || fail "candidate revision was not deployed"
grep -Fq -- "--no-traffic" "$CALLS" || fail "candidate was not deployed with zero traffic"
grep -Fq "curl -sS --max-redirs 0" "$CALLS" || fail "candidate smoke followed redirects"
! grep -Fq "update-traffic sample-web-stage" "$CALLS" || fail "candidate changed normal staging traffic"
! grep -Fq "verify-ok" "$CALLS" || fail "candidate ran authenticated staging automation"
pass "zero-traffic visual candidate remains non-promotable"

: > "$CALLS"
printf 'STAGE\n' | run_release --stage > "$TEST_ROOT/stage.log" 2>&1
grep -Fq "STAGE: PASS" "$TEST_ROOT/stage.log" || fail "stage did not pass"
[[ -f "$REPO/.release-evidence/staging.json" ]] || fail "stage receipt missing"
! grep -Fq "gcloud builds submit" "$CALLS" || fail "stage rebuilt the reviewed candidate"
! grep -Fq "run deploy sample-web-stage" "$CALLS" || fail "stage redeployed the reviewed candidate revision"
grep -Fq "update-traffic sample-web-stage --to-revisions=sample-web-stage-${EXPECTED_SHA:0:12}=100" "$CALLS" || fail "staging traffic did not target the exact revision"
grep -Fq "verify-ok url=https://stage.example.test" "$CALLS" || fail "staging journey did not use the stable exact-revision service origin"
pass "build-once staging receipt and exact revision"

mv "$REPO/.release-evidence/staging.json" "$REPO/.release-evidence/first-stage.json"
: > "$CALLS"
printf 'STAGE\n' | run_release --stage > "$TEST_ROOT/resume-stage.log" 2>&1
grep -Fq "STAGE: PASS" "$TEST_ROOT/resume-stage.log" || fail "interrupted stage did not reconcile"
! grep -Fq "gcloud builds submit" "$CALLS" || fail "interrupted stage recovery rebuilt the image"
! grep -Fq "run deploy sample-web-stage" "$CALLS" || fail "interrupted stage recovery redeployed the exact revision"
rm "$REPO/.release-evidence/first-stage.json"
pass "interrupted staging resumes exact build and revision"

before_builds="$(grep -c 'gcloud builds submit' "$CALLS" || true)"
printf 'DEPLOY\n' | run_release --promote > "$TEST_ROOT/promote.log" 2>&1
grep -Fq "PROMOTION: PASS" "$TEST_ROOT/promote.log" || fail "promotion did not pass"
[[ -f "$REPO/.release-evidence/production.json" ]] || fail "promotion receipt missing"
[[ "$(grep -c 'gcloud builds submit' "$CALLS")" -eq "$before_builds" ]] || fail "promotion rebuilt the image"
grep -Fq "run deploy sample-web --image=${TEST_IMAGE}@${EXPECTED_DIGEST}" "$CALLS" || fail "production did not use the staged immutable digest"
grep -Fq "update-traffic sample-web --to-revisions=sample-web-${EXPECTED_SHA:0:12}=100" "$CALLS" || fail "production traffic did not target the exact candidate revision"
pass "exact-image no-rebuild production promotion"

python_for_test="${STAGED_RELEASE_PYTHON:?}"
"$python_for_test" -B -c 'import json,sys; p=sys.argv[1]; d=json.load(open(p,encoding="utf-8")); d["build"]["rulesSha256"]="sha256:"+"f"*64; open(p,"w",encoding="utf-8").write(json.dumps(d))' "$REPO/.release-evidence/staging.json"
prod_deploys="$(grep -c 'run deploy sample-web --image' "$CALLS")"
if printf 'DEPLOY\n' | run_release --promote > "$TEST_ROOT/tamper.log" 2>&1; then
  fail "tampered staging receipt was promoted"
fi
[[ "$(grep -c 'run deploy sample-web --image' "$CALLS")" -eq "$prod_deploys" ]] || fail "tampered receipt reached production deployment"
pass "tampered receipt rejected before production mutation"

if grep -Eiq 'password|private[_ -]?key|client[_ -]?secret|bearer [A-Za-z0-9._-]{20,}' "$REPO/.release-evidence/"*.json; then
  fail "evidence receipt contains secret-like material"
fi
pass "receipt secret scan"

echo "ALL STAGED RELEASE TESTS PASSED"
