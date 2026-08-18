#!/usr/bin/env bash
set -euo pipefail

TOOLKIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$TOOLKIT_DIR/deploy.sh"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/deployment-automation-test.XXXXXX")"

cleanup() {
  if [[ -n "${TEST_ROOT:-}" && -d "$TEST_ROOT" && "$TEST_ROOT" == *deployment-automation-test.* ]]; then
    rm -rf -- "$TEST_ROOT"
  fi
}
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

bash -n "$DEPLOY_SCRIPT"
DEPLOY_CONFIG= bash "$DEPLOY_SCRIPT" --help >/dev/null
pass "syntax and help"

BIN="$TEST_ROOT/bin"
REPO="$TEST_ROOT/repo"
ORIGIN="$TEST_ROOT/origin.git"
CONFIG_DIR="$TEST_ROOT/config with spaces"
CALLS="$TEST_ROOT/calls.log"
MARKER="$TEST_ROOT/config-executed"
mkdir -p "$BIN" "$REPO/app" "$CONFIG_DIR"
: > "$CALLS"

cat > "$BIN/build-ok" <<'STUB'
#!/usr/bin/env bash
echo "build-ok $* (cwd=$PWD)" >> "${STUB_CALLS_LOG:?}"
mkdir -p dist/assets
printf '%s\n' '<html><script src="/assets/index-fake123.js"></script></html>' > dist/index.html
echo "sample production build"
STUB

cat > "$BIN/gcloud" <<'STUB'
#!/usr/bin/env bash
args="$*"
echo "gcloud $args" >> "${STUB_CALLS_LOG:?}"
case "$args" in
  *"config get-value project"*) echo "${TEST_PROJECT:?}" ;;
  *"auth list"*) echo "tester@example.com" ;;
  *"billing projects describe"*) echo "True" ;;
  *"projects describe"*) echo "${TEST_PROJECT:?}" ;;
  *"services list"*"config.name=cloudbuild.googleapis.com"*) echo "cloudbuild.googleapis.com" ;;
  *"services list"*"config.name=artifactregistry.googleapis.com"*) echo "artifactregistry.googleapis.com" ;;
  *"services list"*"config.name=run.googleapis.com"*) echo "run.googleapis.com" ;;
  *"builds submit"*) echo "unexpected build submission" >&2; exit 99 ;;
  *"builds list"*)
    if [[ "$args" == *"substitutions.COMMIT_SHA="* ]]; then
      [[ "${BUILD_LOOKUP_FAIL:-0}" != "1" ]] || exit 7
      printf '%s' "${EXISTING_BUILD_ROWS:-}"
    elif [[ "$args" == *"value(status)"* ]]; then echo "SUCCESS"
    else echo "build-id SUCCESS"
    fi ;;
  *"container images describe"*)
    [[ "${REGISTRY_DIGEST_MODE:-ok}" != "fail" ]] || exit 2
    echo "${REGISTRY_DIGEST:-${EXPECTED_DIGEST:?}}" ;;
  *"run revisions list"*)
    if [[ "$args" == *"--limit 3"* ]]; then
      echo "${TEST_SERVICE:?}-00002-test"
      echo "${TEST_SERVICE:?}-00001-prev"
    else
      echo "${TEST_SERVICE:?}-00002-test"
    fi ;;
  *"run revisions describe"*)
    case "${REVISION_IMAGE_MODE:-digest}" in
      fail) exit 2 ;;
      tag) echo "${TEST_IMAGE:?}:${EXPECTED_SHA:?}" ;;
      digest) echo "${TEST_IMAGE:?}@${REVISION_DIGEST:-${EXPECTED_DIGEST:?}}" ;;
      *) exit 2 ;;
    esac ;;
  *"run services describe"*)
    if [[ "$args" == *"revisionName"* ]]; then echo "${TEST_SERVICE:?}-00002-test"
    elif [[ "$args" == *"percent"* ]]; then echo "75"
    else exit 2; fi ;;
  *) echo "unhandled gcloud call: $args" >&2; exit 2 ;;
esac
STUB

cat > "$BIN/curl" <<'STUB'
#!/usr/bin/env bash
echo "curl $*" >> "${STUB_CALLS_LOG:?}"
out=""; fmt=""; url=""; follow=0; curl_rc=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|-S|-sS|-k) shift ;;
    -L) follow=1; shift ;;
    --max-redirs) shift 2 ;;
    -o) out="$2"; shift 2 ;;
    -w) fmt="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
case "$url" in
  "https://sample.example.com/")
    body='<html><script src="/assets/index-fake123.js"></script></html>'; code=200 ;;
  "https://sample.example.com/health")
    case "${ROUTE_RESPONSE_MODE:-ok}" in
      ok) body='<html><script src="/assets/index-fake123.js"></script></html>'; code=200 ;;
      redirect-ok)
        body='<html><script src="/assets/index-fake123.js"></script></html>'
        if [[ "$follow" -eq 1 ]]; then code=200; else code=301; fi ;;
      redirect-bad)
        body='bad redirect'
        if [[ "$follow" -eq 1 ]]; then code=000; curl_rc=3; else code=301; fi ;;
      *) exit 2 ;;
    esac ;;
  "https://sample.example.com/assets/index-fake123.js")
    body='console.log("sample bundle")'; code=200 ;;
  *) body='not found'; code=404 ;;
esac
if [[ -n "$out" ]]; then printf '%s' "$body" > "$out"; else printf '%s' "$body"; fi
if [[ -n "$fmt" ]]; then printf '%s' "${fmt//\%\{http_code\}/$code}"; fi
exit "$curl_rc"
STUB

cp "$BIN/curl" "$BIN/curl.exe"
chmod +x "$BIN/build-ok" "$BIN/gcloud" "$BIN/curl" "$BIN/curl.exe"

printf '%s\n' 'placeholder' > "$REPO/app/placeholder.txt"
printf '%s\n' 'steps: []' > "$REPO/cloudbuild.yaml"
printf '%s\n' 'app/dist/' > "$REPO/.gitignore"
git -C "$REPO" init --initial-branch=main --quiet
git -C "$REPO" config user.name "Deployment Automation Test"
git -C "$REPO" config user.email "test@example.invalid"
git -C "$REPO" add -- .gitignore app/placeholder.txt cloudbuild.yaml
git -C "$REPO" commit --quiet -m "fixture"
git init --bare --quiet "$ORIGIN"
git -C "$REPO" remote add origin "$ORIGIN"
git -C "$REPO" push --quiet -u origin main

VALID_CONFIG="$CONFIG_DIR/deployment.config"
cat > "$VALID_CONFIG" <<'CONFIG'
DEPLOY_PROJECT=test-project-12345
DEPLOY_SERVICE=sample-web
DEPLOY_REGION=us-central1
DEPLOY_BRANCH=main
DEPLOY_DOMAIN=https://sample.example.com
BUILD_WORKING_DIRECTORY=app
BUILD_COMMAND=build-ok --production
CLOUD_BUILD_CONFIG=cloudbuild.yaml
IMAGE_REPOSITORY=gcr.io/test-project-12345/sample-web
DEFAULT_VERIFY_ROUTE=/health
EXPECTED_TRAFFIC_PERCENT=75
CONFIG

export PATH="$BIN:$PATH"
export STUB_CALLS_LOG="$CALLS"
export TEST_PROJECT="test-project-12345"
export TEST_SERVICE="sample-web"
export TEST_IMAGE="gcr.io/test-project-12345/sample-web"
export EXPECTED_SHA="$(git -C "$REPO" rev-parse HEAD)"
export EXPECTED_DIGEST="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

run_from_repo() {
  (cd "$REPO" && DEPLOY_CONFIG="$1" bash "$DEPLOY_SCRIPT" "${@:2}")
}

run_from_repo "$VALID_CONFIG" --check > "$TEST_ROOT/check.log" 2>&1
grep -Fq "CHECK: PASS" "$TEST_ROOT/check.log" || fail "valid configuration did not pass --check"
grep -Fq "branch: main" "$TEST_ROOT/check.log" || fail "configured branch was not used"
grep -Fq "build-ok --production" "$CALLS" || fail "configured build command was not executed"
! grep -Fq "builds submit" "$CALLS" || fail "--check submitted a build"
pass "configured preflight and build command"

MUTATING_CONFIG="$CONFIG_DIR/mutating-build.config"
sed 's|^BUILD_COMMAND=.*|BUILD_COMMAND=build-ok --production && echo changed > ../app/placeholder.txt|' "$VALID_CONFIG" > "$MUTATING_CONFIG"
if run_from_repo "$MUTATING_CONFIG" --check > "$TEST_ROOT/mutating-build.log" 2>&1; then
  fail "tracked production-build mutation was accepted"
fi
grep -Fq "production build changed tracked or untracked repository content" "$TEST_ROOT/mutating-build.log" || fail "post-build clean-tree failure was unclear"
! grep -Fq "builds submit" "$CALLS" || fail "mutating build submitted a cloud build"
git -C "$REPO" checkout --quiet -- app/placeholder.txt
pass "post-build clean-tree gate"

if command -v cygpath >/dev/null 2>&1; then
  WINDOWS_CONFIG="$(cygpath -w "$VALID_CONFIG")"
  run_from_repo "$WINDOWS_CONFIG" --check > "$TEST_ROOT/windows-path.log" 2>&1
  grep -Fq "CHECK: PASS" "$TEST_ROOT/windows-path.log" || fail "Windows DEPLOY_CONFIG path was not accepted"
  pass "Windows Git Bash configuration path"
fi

: > "$CALLS"
run_from_repo "$VALID_CONFIG" --deploy --dry-run > "$TEST_ROOT/dry-run.log" 2>&1
grep -Fq "DRY-RUN: stopping before the gate" "$TEST_ROOT/dry-run.log" || fail "dry-run did not stop before submission"
! grep -Fq "builds submit" "$CALLS" || fail "dry-run submitted a build"
pass "dry-run safety gate"

: > "$CALLS"
if run_from_repo "$VALID_CONFIG" --deploy </dev/null > "$TEST_ROOT/empty-gate.log" 2>&1; then
  fail "empty approval transport was accepted"
fi
grep -Fq "approval input transport failed" "$TEST_ROOT/empty-gate.log" || fail "empty approval transport error was unclear"
! grep -Fq "builds submit" "$CALLS" || fail "empty approval transport submitted a build"
pass "empty approval transport rejected"

: > "$CALLS"
if printf 'DEPLOY\r\n' | run_from_repo "$VALID_CONFIG" --deploy > "$TEST_ROOT/crlf-gate.log" 2>&1; then
  fail "stubbed CRLF deployment unexpectedly succeeded"
fi
grep -Fq "normalized one trailing carriage return" "$TEST_ROOT/crlf-gate.log" || fail "CRLF approval was not diagnosed"
grep -Fq "builds submit" "$CALLS" || fail "normalized CRLF approval did not reach the submission boundary"
pass "Windows CRLF approval transport"

: > "$CALLS"
export EXISTING_BUILD_ROWS="build-working,WORKING,$EXPECTED_SHA"
if printf 'DEPLOY\n' | run_from_repo "$VALID_CONFIG" --deploy > "$TEST_ROOT/duplicate-sha.log" 2>&1; then
  fail "matching in-progress SHA was accepted"
fi
grep -Fq "Build ID: build-working | status: WORKING" "$TEST_ROOT/duplicate-sha.log" || fail "duplicate-SHA record was not reported"
grep -Fq "substitutions.COMMIT_SHA=$EXPECTED_SHA" "$CALLS" || fail "duplicate-SHA query did not use the exact unquoted commit"
grep -Fq "status=(QUEUED,WORKING,SUCCESS)" "$CALLS" || fail "duplicate-SHA query did not filter blocking statuses"
! grep -Fq "builds submit" "$CALLS" || fail "duplicate-SHA guard submitted a build"
unset EXISTING_BUILD_ROWS
pass "duplicate SHA submission guard"

: > "$CALLS"
export BUILD_LOOKUP_FAIL=1
if printf 'DEPLOY\n' | run_from_repo "$VALID_CONFIG" --deploy > "$TEST_ROOT/lookup-failure.log" 2>&1; then
  fail "failed duplicate lookup was accepted"
fi
grep -Fq "duplicate check failed for exact commit" "$TEST_ROOT/lookup-failure.log" || fail "duplicate lookup failure was unclear"
! grep -Fq "builds submit" "$CALLS" || fail "failed duplicate lookup submitted a build"
unset BUILD_LOOKUP_FAIL
pass "duplicate lookup fails closed"

: > "$CALLS"
run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/verify.log" 2>&1
grep -Fq "traffic 75%" "$TEST_ROOT/verify.log" || fail "configured traffic percentage was not used"
grep -Fq "GET https://sample.example.com/health -> HTTP 200" "$TEST_ROOT/verify.log" || fail "configured domain/route was not used"
grep -Fq "approved image tag contains expected SHA ($TEST_IMAGE:$EXPECTED_SHA)" "$TEST_ROOT/verify.log" || fail "approved SHA tag was not reported"
grep -Fq "approved image tag resolves to immutable digest ($TEST_IMAGE:$EXPECTED_SHA -> $EXPECTED_DIGEST)" "$TEST_ROOT/verify.log" || fail "registry digest was not reported"
grep -Fq "revision digest matches approved image digest ($EXPECTED_DIGEST)" "$TEST_ROOT/verify.log" || fail "digest equality was not verified"
grep -Fq "Image digest      : $EXPECTED_DIGEST" "$TEST_ROOT/verify.log" || fail "handover omitted the immutable digest"
grep -Fq "gcloud container images describe $TEST_IMAGE:$EXPECTED_SHA" "$CALLS" || fail "exact approved tag was not resolved"
grep -Fq "INFRA VERIFY      : PASS" "$TEST_ROOT/verify.log" || fail "stubbed infrastructure verification failed"
grep -Fq "REPORT RECONCILE: PASS" "$TEST_ROOT/verify.log" || fail "stable standalone verify did not print REPORT RECONCILE: PASS"
! grep -Fq "builds submit" "$CALLS" || fail "--verify submitted a build"
pass "configured standalone verification"

: > "$CALLS"
git -C "$REPO" commit --allow-empty --quiet -m "newer remote"
git -C "$REPO" push --quiet origin main
git -C "$REPO" reset --hard --quiet "$EXPECTED_SHA"
if run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/stale-remote.log" 2>&1; then
  fail "newer remote commit was reported as current"
fi
grep -Fq "REPORT RECONCILE: STALE" "$TEST_ROOT/stale-remote.log" || fail "newer remote commit did not print REPORT RECONCILE: STALE"
grep -Fq "origin/main is" "$TEST_ROOT/stale-remote.log" || fail "stale remote diagnostic was unclear"
git -C "$REPO" push --quiet --force origin main
pass "stale remote commit rejected"

: > "$CALLS"
export ROUTE_RESPONSE_MODE=redirect-ok
run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/redirect-ok.log" 2>&1
grep -Fq "HTTP 200 (final response after redirects)" "$TEST_ROOT/redirect-ok.log" || fail "valid redirect chain was not accepted"
grep -Fq "curl -sS -L --max-redirs 10" "$CALLS" || fail "route verification did not follow bounded redirects"
grep -Fq -- "--retry 2 --retry-all-errors --retry-delay 2 --max-time 30" "$CALLS" || fail "route verification did not use bounded transient retries"
unset ROUTE_RESPONSE_MODE
pass "valid redirect chain and bounded transient retry"

: > "$CALLS"
export ROUTE_RESPONSE_MODE=redirect-bad
if run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/redirect-bad.log" 2>&1; then
  fail "broken redirect chain was accepted"
fi
grep -Fq "HTTP '000' after redirects (curl exit 3), expected final HTTP 200" "$TEST_ROOT/redirect-bad.log" || fail "broken redirect diagnostic was unclear"
unset ROUTE_RESPONSE_MODE
pass "broken redirect chain rejected"

export REVISION_DIGEST="sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
if run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/digest-mismatch.log" 2>&1; then
  fail "revision digest mismatch was accepted"
fi
grep -Fq "revision digest '$REVISION_DIGEST' differs from approved image digest '$EXPECTED_DIGEST'" "$TEST_ROOT/digest-mismatch.log" || fail "digest-mismatch error was unclear"
unset REVISION_DIGEST
pass "revision digest mismatch rejected"

export REGISTRY_DIGEST_MODE="fail"
if run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/tag-digest-missing.log" 2>&1; then
  fail "missing registry digest was accepted"
fi
grep -Fq "cannot resolve approved image tag '$TEST_IMAGE:$EXPECTED_SHA'" "$TEST_ROOT/tag-digest-missing.log" || fail "missing registry-digest error was unclear"
unset REGISTRY_DIGEST_MODE
pass "missing registry digest rejected"

export REVISION_IMAGE_MODE="tag"
if run_from_repo "$VALID_CONFIG" --verify > "$TEST_ROOT/revision-digest-missing.log" 2>&1; then
  fail "revision image without an immutable digest was accepted"
fi
grep -Fq "cannot retrieve an immutable sha256 digest from revision image '$TEST_IMAGE:$EXPECTED_SHA'" "$TEST_ROOT/revision-digest-missing.log" || fail "missing revision-digest error was unclear"
unset REVISION_IMAGE_MODE
pass "missing revision digest rejected"

DUPLICATE_CONFIG="$CONFIG_DIR/duplicate.config"
cp "$VALID_CONFIG" "$DUPLICATE_CONFIG"
printf '%s\n' 'DEPLOY_PROJECT=second-project-12345' >> "$DUPLICATE_CONFIG"
if run_from_repo "$DUPLICATE_CONFIG" --check > "$TEST_ROOT/duplicate.log" 2>&1; then
  fail "duplicate key was accepted"
fi
grep -Fq "duplicate configuration key" "$TEST_ROOT/duplicate.log" || fail "duplicate-key error was unclear"
pass "duplicate key rejected"

MISSING_CONFIG="$CONFIG_DIR/missing.config"
grep -v '^BUILD_COMMAND=' "$VALID_CONFIG" > "$MISSING_CONFIG"
if run_from_repo "$MISSING_CONFIG" --check > "$TEST_ROOT/missing.log" 2>&1; then
  fail "missing key was accepted"
fi
grep -Fq "missing required configuration value: BUILD_COMMAND" "$TEST_ROOT/missing.log" || fail "missing-key error was unclear"
pass "missing value rejected"

UNKNOWN_CONFIG="$CONFIG_DIR/unknown.config"
cp "$VALID_CONFIG" "$UNKNOWN_CONFIG"
printf '%s\n' 'UNKNOWN_KEY=$(touch "$PARSER_MARKER")' >> "$UNKNOWN_CONFIG"
export PARSER_MARKER="$MARKER"
: > "$CALLS"
if run_from_repo "$UNKNOWN_CONFIG" --check > "$TEST_ROOT/unknown.log" 2>&1; then
  fail "unknown key was accepted"
fi
grep -Fq "unknown configuration key" "$TEST_ROOT/unknown.log" || fail "unknown-key error was unclear"
[[ ! -e "$MARKER" ]] || fail "configuration executed a shell command"
[[ ! -s "$CALLS" ]] || fail "invalid configuration reached build or cloud commands"
pass "unknown key rejected without executing configuration"

echo "ALL TESTS PASSED"
