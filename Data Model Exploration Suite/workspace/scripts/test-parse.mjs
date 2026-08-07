import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDbmlPath } from './schema-input.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dbmlPath = resolveDbmlPath();
const src = readFileSync(dbmlPath, 'utf8');

const { parseDbml } = await import('../src/lib/dbml-parse.ts');
console.log('import ok');
try {
  const parsed = parseDbml(src);
  console.log('tables:', parsed.tables.length);
  console.log('refs:', parsed.refs.length);
  console.log('enums:', parsed.enums.length);
  console.log('groups:', parsed.tableGroups.length);
  const t = parsed.tables[0];
  console.log(`${t.name} cols:`, t.columns.map((c) => `${c.name}${c.pk ? ' pk' : ''}${c.notNull ? ' nn' : ''}`).join(', '));
  const comp = parsed.refs.find((r) => r.endpoints.some((e) => e.columns.length > 1));
  console.log('composite ref:', JSON.stringify(comp.endpoints));
} catch (e) {
  console.error('PARSE FAIL:', e.message);
  process.exit(1);
}
