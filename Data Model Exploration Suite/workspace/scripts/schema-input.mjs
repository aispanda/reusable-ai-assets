import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function resolveDbmlPath() {
  const configPath = join(workspaceRoot, 'workspace.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const configured = process.env.DATA_MODEL_DBML_PATH || config.schemaPath;
  if (!configured || typeof configured !== 'string') {
    throw new Error('Set schemaPath in workspace.config.json or DATA_MODEL_DBML_PATH.');
  }
  const path = isAbsolute(configured) ? resolve(configured) : resolve(workspaceRoot, configured);
  if (!existsSync(path)) throw new Error(`Canonical DBML not found: ${path}`);
  return path;
}

export function displayDbmlPath(path) {
  const local = relative(workspaceRoot, path).replace(/\\/g, '/');
  return local.startsWith('..') ? path : local;
}
