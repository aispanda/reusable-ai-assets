import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { displayDbmlPath, resolveDbmlPath } from './schema-input.mjs';

// QA evidence: parse the canonical schema via @dbml/core dbmlv2 and report
// tabulated counts + a reference sample so reviewers can verify from output.
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const { buildModel, validateModel } = await import(pathToFileURL(join(root, 'src', 'lib', 'model')).href + '.ts');
const { Parser } = await import('@dbml/core');

const dbmlPath = resolveDbmlPath();
const source = readFileSync(dbmlPath, 'utf8');

const parser = new Parser();
const raw = parser.parse(source, 'dbmlv2');
const schema = raw.schemas[0];
const model = buildModel(source);
const issues = validateModel(model);

const tables = model.tables;
const fieldCounts = tables.map((t) => t.fields.length);
const composite = model.relationships.filter((r) => r.composite);

const report = {
  tool: '@dbml/core Parser.parse(source, "dbmlv2")',
  dbml: displayDbmlPath(dbmlPath),
  counts: {
    tables: schema.tables.length,
    enums: schema.enums.length,
    refs: schema.refs.length,
    tableGroups: schema.tableGroups?.length ?? 0,
    modelTables: tables.length,
    modelRelationships: model.relationships.length,
    compositeRelationships: composite.length,
    totalFields: fieldCounts.reduce((a, b) => a + b, 0),
    minFieldsPerTable: Math.min(...fieldCounts),
    maxFieldsPerTable: Math.max(...fieldCounts),
  },
  validationIssues: issues,
  sampleComposite: composite[0] ?? null,
  tableNames: tables.map((t) => t.name),
};

console.log(JSON.stringify(report, null, 2));
