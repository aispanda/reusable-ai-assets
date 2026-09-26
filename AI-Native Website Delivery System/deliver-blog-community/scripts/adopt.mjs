// Deterministic local adoption. Cloud deployment remains owned by RA-002.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPackage, installPackage } from './package.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const absolute = value => typeof value === 'string' && path.isAbsolute(value) && !/[\x00-\x1f]/.test(value);
function requireThat(condition, message) { if (!condition) throw new Error(message); }
const ownerIdentity = profile => ({ format: 'blog-adoption-owner/1', site: profile.site, environment: profile.environment,
  installRoot: process.platform === 'win32' ? path.resolve(profile.installRoot).toLowerCase() : path.resolve(profile.installRoot) });
async function fingerprint(filename) {
  requireThat(absolute(filename), 'Absolute file path required');
  const stat = await fs.lstat(filename);
  requireThat(stat.isFile() && !stat.isSymbolicLink(), 'Regular prerequisite file required');
  return hash(await fs.readFile(filename));
}
async function directory(dirname) {
  requireThat(absolute(dirname), 'Absolute directory required');
  requireThat((await fs.stat(dirname)).isDirectory(), 'Working directory missing');
  const actual = await fs.realpath(dirname);
  const expected = path.resolve(dirname);
  requireThat(process.platform === 'win32' ? actual.toLowerCase() === expected.toLowerCase() : actual === expected, 'Redirected directories are not supported');
}
function commandShape(command) {
  requireThat(command && /^[a-z0-9-]{1,60}$/.test(command.id) && absolute(command.executable) && digest(command.sha256), 'Pinned verification executable required');
  requireThat(absolute(command.cwd) && Array.isArray(command.args) && command.args.length <= 40 && command.args.every(a => typeof a === 'string' && a.length < 4096 && !a.includes('\0')), 'Invalid command arguments');
  requireThat(Number.isInteger(command.timeoutMs) && command.timeoutMs >= 100 && command.timeoutMs <= 900000, 'Bounded command timeout required');
}
export async function planAdoption(profilePath, environment) {
  const bytes = await fs.readFile(profilePath);
  const profile = JSON.parse(bytes);
  requireThat(profile.format === 'blog-adoption/1' && /^[a-z0-9-]{1,60}$/.test(profile.site), 'Invalid adoption profile');
  requireThat(['local', 'staging', 'production'].includes(environment) && profile.environment === environment, 'Environment mismatch');
  requireThat(absolute(profile.installRoot) && absolute(profile.archive) && digest(profile.packageSha256), 'Explicit archive, install root and hash required');
  requireThat(profile.expectedPreviousPackageSha256 === undefined || digest(profile.expectedPreviousPackageSha256), 'Invalid expected previous package hash');
  requireThat(Array.isArray(profile.prerequisites) && profile.prerequisites.length > 0 && profile.prerequisites.length <= 100, 'Explicit prerequisites required');
  requireThat(Array.isArray(profile.verification) && profile.verification.length > 0 && profile.verification.length <= 20, 'Verification commands required');
  const payload = await readPackage(profile.archive, profile.packageSha256);
  requireThat(payload.version === profile.packageVersion, 'Package version mismatch');
  const inputs = [];
  for (const item of profile.prerequisites) {
    requireThat(digest(item.sha256), 'Pinned prerequisite hash required');
    const sha256 = await fingerprint(item.path);
    requireThat(sha256 === item.sha256, 'Prerequisite changed: ' + item.path);
    inputs.push({ path: item.path, sha256 });
  }
  const ids = new Set();
  for (const command of profile.verification) {
    commandShape(command);
    requireThat(!ids.has(command.id), 'Duplicate verification id'); ids.add(command.id);
    requireThat(await fingerprint(command.executable) === command.sha256, 'Verification executable changed');
    await directory(command.cwd);
  }
  if (profile.deployment) {
    const d = profile.deployment;
    requireThat(d.owner === 'RA-002' && absolute(d.cwd), 'RA-002 deployment owner required');
    requireThat(d.protocol === 'deploy-sh-v1', 'Unsupported deployment protocol; staged promotion requires its existing consumer owner');
    for (const name of ['executable', 'script', 'config']) {
      requireThat(digest(d[name + 'Sha256']) && await fingerprint(d[name]) === d[name + 'Sha256'], 'Deployment prerequisite changed: ' + name);
    }
    await directory(d.cwd);
  }
  // Never adopt an arbitrary existing folder, including a package installed outside this driver.
  const profileSha256 = hash(bytes);
  let rootExists = false;
  try { await fs.lstat(profile.installRoot); rootExists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (rootExists) {
    await directory(profile.installRoot);
    const marker = JSON.parse(await fs.readFile(path.join(profile.installRoot, 'adoption-owner.json'), 'utf8'));
    const owner = ownerIdentity(profile);
    requireThat(Object.entries(owner).every(([key, value]) => marker[key] === value), 'Install root belongs to another site/environment');
    requireThat(marker.packageSha256 === null || digest(marker.packageSha256), 'Invalid ownership package hash');
    if (marker.packageSha256 !== null && marker.packageSha256 !== profile.packageSha256)
      requireThat(profile.expectedPreviousPackageSha256 === marker.packageSha256, 'Expected previous package hash mismatch');
    if (marker.packageSha256 === null)
      requireThat(profile.expectedPreviousPackageSha256 === undefined, 'No previously verified package to upgrade');
  } else {
    requireThat(profile.expectedPreviousPackageSha256 === undefined, 'No previously verified package to upgrade');
    await directory(path.dirname(profile.installRoot));
  }
  return { status: 'PLANNED', profileSha256, packageSha256: profile.packageSha256, packageVersion: payload.version,
    site: profile.site, environment, installRoot: profile.installRoot, inputs,
    verification: profile.verification.map(c => ({ id: c.id, executable: c.executable, sha256: c.sha256, cwd: c.cwd })), deployment: profile.deployment ? 'RA-002' : 'NOT_CONFIGURED', profile };
}
async function execute(command, extraEnv = {}, input = '') {
  // Config is trusted local code. No shell expansion; output is intentionally not echoed (may contain secrets).
  requireThat(await fingerprint(command.executable) === command.sha256, 'Executable changed before execution');
  return await new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, { cwd: command.cwd, shell: false, windowsHide: true,
      env: { ...process.env, ...extraEnv }, stdio: ['pipe', 'pipe', 'pipe'] });
    const outputHash = createHash('sha256'); let outputBytes = 0; let failure;
    const consume = data => { outputBytes += data.length; outputHash.update(data); if (outputBytes > 4 * 1024 * 1024) { failure = 'output-limit'; child.kill(); } };
    child.stdout.on('data', consume); child.stderr.on('data', consume);
    const timer = setTimeout(() => { failure = 'timeout'; child.kill(); }, command.timeoutMs);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); const result = { id: command.id, exitCode: code, outputBytes, outputSha256: outputHash.digest('hex') };
      if (failure || code !== 0) reject(Object.assign(new Error('Command failed: ' + command.id + (failure ? ' (' + failure + ')' : '')), { evidence: result }));
      else resolve(result);
    });
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
export async function adopt(profilePath, { environment, mode = 'plan', authorization } = {}) {
  requireThat(['plan', 'install', 'verify', 'deploy'].includes(mode), 'Invalid adoption mode');
  let plan = await planAdoption(profilePath, environment);
  const { profile, ...evidence } = plan;
  if (mode === 'plan') return evidence;
  if (mode === 'deploy') {
    requireThat(profile.deployment && environment !== 'local', 'Configured hosted RA-002 target required');
    requireThat(authorization === `DEPLOY:${profile.site}:${environment}:${plan.profileSha256}`, 'Exact site/environment/profile deployment authorization required');
  }
  if (mode === 'verify') {
    await fs.access(path.join(profile.installRoot, 'adoption-owner.json'));
    await fs.access(path.join(profile.installRoot, 'releases', `${profile.packageVersion}-${profile.packageSha256.slice(0,12)}`, 'installation-receipt.json'));
  } else {
    try {
      await fs.mkdir(profile.installRoot); // Parent must already exist; no infrastructure bootstrap.
      await fs.writeFile(path.join(profile.installRoot, 'adoption-owner.json'), JSON.stringify({ ...ownerIdentity(profile), packageSha256: null }) + '\n', { flag: 'wx' });
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  const lock = path.join(profile.installRoot, '.adoption-lock');
  try { await fs.mkdir(lock); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('Adoption is already running or interrupted; inspect its lock'); throw e; }
  try {
  // Revalidate profile and prerequisites after acquiring/creating the owned root.
  plan = await planAdoption(profilePath, environment);
  requireThat(plan.profileSha256 === evidence.profileSha256, 'Profile changed during adoption');
  const installation = await installPackage(profile.archive, profile.packageSha256, profile.installRoot);
  const results = [];
  // Always run verification: no cross-machine, changed-dependency, or timestamp-only cache.
  for (const command of profile.verification) results.push(await execute(command));
  const final = await planAdoption(profilePath, environment);
  requireThat(final.profileSha256 === plan.profileSha256, 'Profile changed during verification');
  await installPackage(profile.archive, profile.packageSha256, profile.installRoot); // Post-test integrity check.
  // Advance only after successful verification; retain previous immutable releases for explicit rollback.
  const markerPath = path.join(profile.installRoot, 'adoption-owner.json');
  const temporaryMarker = path.join(profile.installRoot, '.adoption-owner-' + randomUUID() + '.json');
  await fs.writeFile(temporaryMarker, JSON.stringify({ ...ownerIdentity(profile), packageSha256: profile.packageSha256,
    profileSha256: plan.profileSha256 }) + '\n', { flag: 'wx' });
  await fs.rename(temporaryMarker, markerPath);
  if (mode === 'deploy') {
    const d = profile.deployment;
    const base = { executable: d.executable, sha256: d.executableSha256, cwd: d.cwd, timeoutMs: 900000 };
    results.push(await execute({ ...base, id: 'ra002-preflight', args: [d.script, '--deploy', '--dry-run'] }, { DEPLOY_CONFIG: d.config }));
    // Recheck all pins after preflight. Delegate exact RA-002 interface; never build gcloud commands here.
    const checked = await planAdoption(profilePath, environment);
    requireThat(checked.profileSha256 === plan.profileSha256, 'Profile changed during deployment preflight');
    await installPackage(profile.archive, profile.packageSha256, profile.installRoot);
    results.push(await execute({ ...base, id: 'ra002-deploy', args: [d.script, '--deploy'] }, { DEPLOY_CONFIG: d.config }, 'DEPLOY\n'));
  }
  return { ...evidence, status: mode === 'deploy' ? 'DELEGATED_SUCCESS' : 'VERIFIED', installation, results,
    nodeVersion: process.version, platform: process.platform, architecture: process.arch,
    scope: 'Package installation and explicit checks only; hosted release and anonymous acceptance require RA-002 evidence.' };
  } finally { await fs.rmdir(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, profile, environment, ...rest] = process.argv.slice(2);
  try {
    requireThat(rest.length === 0, 'Usage: node adopt.mjs plan|install|verify|deploy PROFILE ENVIRONMENT');
    console.log(JSON.stringify(await adopt(profile, { mode, environment, authorization: process.env.BLOG_ADOPTION_AUTHORIZATION })));
  } catch (error) { console.error(JSON.stringify({ status: 'BLOCKED', error: error.message, evidence: error.evidence })); process.exitCode = 1; }
}
