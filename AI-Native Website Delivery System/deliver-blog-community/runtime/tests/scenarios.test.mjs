// Execute shared behavioral suites once, then report every contracted scenario.
// PASS for a layer is deliberately not a claim that the whole browser workflow passed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const runtime = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(runtime, '..');
const catalogue = JSON.parse(readFileSync(resolve(root, 'assets/scenarios.json'), 'utf8'));
const version = JSON.parse(readFileSync(resolve(runtime, 'package.json'), 'utf8')).version;
const receiptPath = resolve(root, 'installation-receipt.json');
let packageSha256 = null;
if (existsSync(receiptPath)) {
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  if (receipt.version !== version || !Array.isArray(receipt.files) || !receipt.files.length) throw new Error('Invalid installation identity');
  for (const file of receipt.files) {
    const name = resolve(root, file.path);
    if (!name.startsWith(root + '/') && !name.startsWith(root + '\\')) throw new Error('Invalid installation path');
    if (createHash('sha256').update(readFileSync(name)).digest('hex') !== file.sha256) throw new Error('Installed source differs from package: ' + file.path);
  }
  packageSha256 = receipt.packageSha256;
}
const reportPath = process.env.BLOG_SCENARIO_REPORT ? resolve(process.env.BLOG_SCENARIO_REPORT) : null;
const results = {};
const files = [...new Set(catalogue.scenarios.map(s => s.automationRef).filter(Boolean))];
for (const file of files) {
  const emulator = /(?:community-rules|firestore-rules|http-lifecycle)/.test(file);
  const needsAuth = file.includes('http-lifecycle');
  if (emulator && (!process.env.FIRESTORE_EMULATOR_HOST || needsAuth && !process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
    results[file] = { status: 'UNPROVEN', reason: 'Required isolated emulators not supplied' };
    continue;
  }
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', resolve(root, file)], {
    cwd: runtime, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, METADATA_SERVER_DETECTION: 'none' },
  });
  const output = (run.stdout ?? '') + (run.stderr ?? '');
  const logPath = reportPath ? resolve(dirname(reportPath), file.split('/').at(-1) + '.tap.log') : null;
  if (logPath) { mkdirSync(dirname(logPath), { recursive: true }); writeFileSync(logPath, output); }
  const passed = Number(output.match(/# pass (\d+)/)?.[1] ?? 0);
  const skipped = Number(output.match(/# skipped (\d+)/)?.[1] ?? 0);
  results[file] = { status: run.status !== 0 ? 'FAIL' : passed > 0 ? 'PASS' : 'UNPROVEN', exitCode: run.status,
    tests: Number(output.match(/# tests (\d+)/)?.[1] ?? 0), passed, skipped, evidencePath: logPath,
    ...(!passed && run.status === 0 ? { reason: 'No executed passing assertions; skipped/empty suites are not coverage' } : {}),
    ...(run.error ? { error: run.error.code ?? run.error.message } : {}) };
}
const missing = {
  'EDIT-02': 'Credit document/asset validation is tested; complete uploaded-media browser/Storage lifecycle remains unproven.',
  'EDIT-03': 'Normalized IDs, schema validation and HTTP save/reload/publication are tested; real editor dialog gestures remain unproven.',
  'EDIT-04': 'Fresh Chromium at desktop/320px tests consent, mocked provider failure, fallback and isolated hydrated preview. Real YouTube playback/embedding-disabled behavior remains unproven.',
};
const scenarios = catalogue.scenarios.map(s => {
  const check = results[s.automationRef];
  return { id: s.id, automationRef: s.automationRef, layerResult: check?.status ?? 'UNPROVEN',
    // Retain full scenario as unproven until explicit assertion-level browser/API
    // evidence is supplied. Do not infer complete coverage from an entire suite.
    status: check?.status === 'FAIL' ? 'FAIL' : 'UNPROVEN',
    coverageGap: missing[s.id] ?? 'Linked suite executes relevant checks; full scenario requirements/layers still need assertion-level sign-off.',
  };
});
const report = { format: 'blog-scenarios/1', packageVersion: version, packageSha256,
  scope: 'local-behavioral-layers', createdAt: new Date().toISOString(), suites: results, scenarios,
  complete: false, productionReady: false };
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ packageVersion: version, packageSha256, scenarioCount: scenarios.length,
  layerPass: scenarios.filter(s => s.layerResult === 'PASS').length,
  layerFail: scenarios.filter(s => s.layerResult === 'FAIL').length,
  scenarioUnproven: scenarios.filter(s => s.status === 'UNPROVEN').length,
  reportPath, complete: false }));
process.exitCode = scenarios.some(s => s.status === 'FAIL') || process.argv.includes('--require-complete') ? 1 : 0;
