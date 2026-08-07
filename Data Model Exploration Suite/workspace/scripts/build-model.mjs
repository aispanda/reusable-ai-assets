import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveDbmlPath } from './schema-input.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dbmlPath = resolveDbmlPath();
const outDir = join(root, 'generated');
mkdirSync(outDir, { recursive: true });

const dbmlSource = readFileSync(dbmlPath, 'utf8');
const { buildModel, validateModel } = await import(pathToFileURL(join(root, 'src', 'lib', 'model.ts')).href);
const { buildLayoutSpec } = await import(pathToFileURL(join(root, 'src', 'lib', 'layout-spec.ts')).href);

const model = buildModel(dbmlSource);
const issues = validateModel(model);
if (issues.length > 0) {
  console.error('Model validation failed:');
  for (const i of issues) console.error(`  [${i.code}] ${i.message}`);
  process.exit(1);
}

// Persist the canonical model for the app to import (no re-parse at runtime).
writeFileSync(
  join(outDir, 'model.json'),
  JSON.stringify(
    {
      projectNote: model.projectNote,
      tables: model.tables,
      relationships: model.relationships,
      domainOrder: model.domainOrder,
      // layout specs built per-view in build-layouts
    },
    null,
    2
  ) + '\n',
  'utf8'
);

// Build the three layout specs; positions are added by build-layouts.
for (const mode of ['tables-only', 'keys', 'all-fields']) {
  const spec = buildLayoutSpec(model, mode);
  writeFileSync(join(outDir, `layout-${mode}.json`), JSON.stringify(spec, null, 2) + '\n', 'utf8');
}

console.log(`Model OK: ${model.tables.length} tables, ${model.relationships.length} relationships, ${model.domainOrder.length} domains.`);
