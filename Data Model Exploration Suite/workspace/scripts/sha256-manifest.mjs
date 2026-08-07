import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDbmlPath } from './schema-input.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const workspace = join(here, '..');
const repo = join(workspace, '..', '..');
const outDir = join(workspace, 'qa-evidence');
mkdirSync(outDir, { recursive: true });

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-public', 'generated', 'test-results', 'playwright-report', '.git', 'qa-evidence']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.nvmrc' && entry.name !== '.gitignore') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function hashFile(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

const authorizedExtras = [
  join(repo, 'scripts', 'Main-scripts', 'open_data_model_workspace.ps1'),
  join(repo, 'docs', 'AUTOMATION_ROUTER.md'),
  join(repo, 'docs', 'guides', 'ERD_GENERATION_AND_PRESENTATION.md'),
  join(repo, 'docs', 'DOCUMENTATION_ROUTER.md'),
  join(repo, 'docs', 'AI_SESSION_HANDOVER.md'),
  resolveDbmlPath(),
];

const workspaceFiles = walk(workspace).sort();
const entries = [];

for (const f of workspaceFiles) {
  entries.push({
    path: relative(repo, f).replace(/\\/g, '/'),
    sha256: hashFile(f),
    bytes: statSync(f).size,
  });
}
for (const f of authorizedExtras) {
  try {
    entries.push({
      path: relative(repo, f).replace(/\\/g, '/'),
      sha256: hashFile(f),
      bytes: statSync(f).size,
    });
  } catch {
    // skip missing
  }
}

entries.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  label: 'after',
  createdAt: new Date().toISOString(),
  note: 'SHA-256 inventory of the Data Model Workspace tree (excluding generated/dist/node_modules) plus authorized router/docs/launcher/canonical DBML. Git was unavailable for verification; this is the durable change evidence.',
  fileCount: entries.length,
  files: entries,
};

const outPath = join(outDir, 'sha256-after.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Wrote ${entries.length} hashes → ${outPath}`);
