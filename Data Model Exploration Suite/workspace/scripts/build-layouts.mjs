import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const gen = join(root, 'generated');

const { default: ELK } = await import('elkjs');
const elk = new ELK();

async function layoutFor(mode, domain) {
  const fullSpec = JSON.parse(readFileSync(join(gen, `layout-${mode}.json`), 'utf8'));
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
  const pos = new Map();
  for (const child of res.children ?? []) {
    pos.set(child.id, { x: Math.round(child.x ?? 0), y: Math.round(child.y ?? 0) });
  }
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

const modes = ['tables-only', 'keys', 'all-fields'];
const firstSpec = JSON.parse(readFileSync(join(gen, 'layout-keys.json'), 'utf8'));
const domains = [...new Set(firstSpec.tables.map((table) => table.domain).filter(Boolean))];
const domainLayouts = {};
for (const mode of modes) {
  const laid = await layoutFor(mode);
  writeFileSync(join(gen, `positions-${mode}.json`), JSON.stringify(laid, null, 2) + '\n', 'utf8');
  console.log(`Layout ${mode}: ${laid.tables.length} nodes positioned.`);
  domainLayouts[mode] = {};
  for (const domain of domains) {
    domainLayouts[mode][domain] = await layoutFor(mode, domain);
  }
}
writeFileSync(join(gen, 'positions-domains.json'), JSON.stringify(domainLayouts, null, 2) + '\n', 'utf8');
