import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveDbmlPath } from './schema-input.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dbmlPath = resolveDbmlPath();
const src = readFileSync(dbmlPath, 'utf8');

const { Parser } = await import('@dbml/core');
const parser = new Parser();
const db = parser.parse(src, 'dbml');
const schema = db.schemas[0];
const tables = schema.tables;
const refs = schema.refs;
const groups = schema.tableGroupSet ? schema.tableGroupSet : (db.tableGroups || []);

console.log('tables:', tables.length);
console.log('refs:', refs.length);
console.log('enums:', schema.enums.length);
console.log('tableGroups:', Array.isArray(groups) ? groups.length : 'n/a');

const t = tables[0];
console.log('\nTABLE[0]:', t.name, '| note:', t.note, '| headerColor:', t.headerColor);
console.log('fields:', t.fields.length, 'field keys:', Object.keys(t.fields[0] || {}));
if (t.fields[0]) {
  const f = t.fields[0];
  console.log('field0:', JSON.stringify({ name: f.name, type: f.type, pk: f.pk, not_null: f.not_null, unique: f.unique, default: f.dbdefault }, null, 2));
}

// First composite relationship, when present.
const composite = refs.find((r) => {
  const ep = r.endpoints[0];
  return (ep.fieldNames && ep.fieldNames.length > 1) || (ep.fields && ep.fields.length > 1);
});
if (composite) {
  console.log('\nCOMPOSITE REF endpoints:');
  composite.endpoints.forEach((e) => {
    console.log(' ', JSON.stringify({ tableName: e.tableName, schemaName: e.schemaName, fieldNames: e.fieldNames, relation: e.relation }));
  });
}
const oneToOne = refs.find((r) => r.endpoints.some((e) => e.relation === '1' && composite && composite !== r));
console.log('\nfirst ref relation pair:', refs[0].endpoints.map((e) => e.relation).join('-'));
