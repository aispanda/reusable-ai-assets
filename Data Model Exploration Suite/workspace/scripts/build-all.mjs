import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveDbmlPath } from './schema-input.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dbmlPath = resolveDbmlPath();
const gen = join(root, 'generated');
mkdirSync(gen, { recursive: true });

const { buildModel, validateModel } = await import(pathToFileURL(join(root, 'src', 'lib', 'model')).href + '.ts');
const { buildLayoutSpec } = await import(pathToFileURL(join(root, 'src', 'lib', 'layout-spec')).href + '.ts');
const { default: ELK } = await import('elkjs');

const dbmlSource = readFileSync(dbmlPath, 'utf8');
const model = buildModel(dbmlSource);
const issues = validateModel(model);
if (issues.length > 0) {
  console.error('Model validation failed:');
  for (const i of issues) console.error(`  [${i.code}] ${i.message}`);
  process.exit(1);
}

writeFileSync(
  join(gen, 'model.json'),
  JSON.stringify({ projectNote: model.projectNote, tables: model.tables, relationships: model.relationships, domainOrder: model.domainOrder }, null, 2) + '\n',
  'utf8'
);

const elk = new ELK();
const MODES = ['tables-only', 'keys', 'all-fields'];

async function layoutFor(mode, domain) {
  const fullSpec = buildLayoutSpec(model, mode);
  const domainTables = domain ? fullSpec.tables.filter((table) => table.domain === domain) : fullSpec.tables;
  const tableNames = new Set(domainTables.map((table) => table.name));
  const spec = {
    ...fullSpec,
    tables: domainTables,
    edges: domain ? fullSpec.edges.filter((edge) => tableNames.has(edge.source) && tableNames.has(edge.target)) : fullSpec.edges,
  };
  const children = spec.tables.map((t) => ({ id: t.name, width: t.width, height: t.height }));
  const edges = spec.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] }));
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '36',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children,
    edges,
  };
  const res = await elk.layout(graph);
  const pos = new Map((res.children ?? []).map((c) => [c.id, { x: Math.round(c.x ?? 0), y: Math.round(c.y ?? 0) }]));
  const tables = spec.tables.map((t) => ({ ...t, ...pos.get(t.name) }));
  const edgesOut = spec.edges.map((e) => ({ ...e, ...routeEdge(res, e) }));
  return { mode, tables, edges: edgesOut };
}

function routeEdge(res, edge) {
  const hit = (res.edges ?? []).find((x) => x.id === edge.id);
  if (!hit || !hit.sections || hit.sections.length === 0) return {};
  const s = hit.sections[0];
  return { points: [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] };
}

const domainLayouts = {};
for (const mode of MODES) {
  const laid = await layoutFor(mode);
  writeFileSync(join(gen, `positions-${mode}.json`), JSON.stringify(laid, null, 2) + '\n', 'utf8');
  console.log(`Layout ${mode}: ${laid.tables.length} nodes positioned, ${laid.edges.length} edges.`);
  domainLayouts[mode] = {};
  for (const domain of model.domainOrder) {
    domainLayouts[mode][domain] = await layoutFor(mode, domain);
  }
}
writeFileSync(join(gen, 'positions-domains.json'), JSON.stringify(domainLayouts, null, 2) + '\n', 'utf8');
console.log(`Model OK: ${model.tables.length} tables, ${model.relationships.length} relationships, ${model.domainOrder.length} domains.`);
