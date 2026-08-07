import { readFileSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel, validateModel, type DataModel } from '../src/lib/model';

const here = dirname(fileURLToPath(import.meta.url));
const workspace = join(here, '..');
const config = JSON.parse(readFileSync(join(workspace, 'workspace.config.json'), 'utf8')) as { schemaPath: string };
const configured = process.env.DATA_MODEL_DBML_PATH || config.schemaPath;
const CANONICAL = isAbsolute(configured) ? configured : resolve(workspace, configured);

export function loadCanonicalDbml(): string {
  return readFileSync(CANONICAL, 'utf8');
}

export function loadModel(): { model: DataModel; source: string } {
  const source = loadCanonicalDbml();
  const model = buildModel(source);
  return { model, source };
}

export function expectValidModel(model: DataModel) {
  const issues = validateModel(model);
  if (issues.length > 0) {
    throw new Error(`Canonical model failed validation:\n${issues.map((i) => `  [${i.code}] ${i.message}`).join('\n')}`);
  }
}
