import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Connection,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react';
import { nodeTypes } from './nodeTypes';
import { edgeTypes } from './edgeTypes';
import '@xyflow/react/dist/style.css';
import positionsKeys from '../generated/positions-keys.json';
import { runtimeModel as model } from './lib/runtime-model';
import { parseUrlState, buildUrlState } from './lib/url-state';
import { neighbors, findPath } from './lib/graph';
import { decodeSelector, encodeSelector, type Selector, selectorLabel } from './lib/selectors';
import { VIEW_MODES, type ViewMode } from './lib/views';
import { governanceStore } from './lib/governance-api';
import './styles.css';

const layoutCache: Record<ViewMode, typeof positionsKeys | undefined> = { 'tables-only': undefined, keys: positionsKeys, 'all-fields': undefined };
type DomainLayouts = Record<ViewMode, Record<string, typeof positionsKeys>>;
let domainLayoutsCache: DomainLayouts | undefined;

function useHashState() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const state = useMemo(() => parseUrlState(hash), [hash]);
  const update = (partial: Parameters<typeof buildUrlState>[0]) => {
    const next = buildUrlState({ ...state, ...partial });
    if (next !== window.location.hash) window.location.hash = next;
  };
  return { state, update };
}

function useLayout(view: ViewMode, domain?: string) {
  const wantedKey = `${view}:${domain ?? '*'}`;
  const initial = domain ? domainLayoutsCache?.[view]?.[domain] : layoutCache[view];
  const [loaded, setLoaded] = useState<{ key: string; data?: typeof positionsKeys }>({ key: wantedKey, data: initial });
  useEffect(() => {
    let cancelled = false;
    if (domain) {
      const cached = domainLayoutsCache?.[view]?.[domain];
      if (cached) setLoaded({ key: wantedKey, data: cached });
      else {
        setLoaded({ key: wantedKey });
        import('../generated/positions-domains.json').then((module) => {
          if (cancelled) return;
          domainLayoutsCache = (module as { default: DomainLayouts }).default;
          setLoaded({ key: wantedKey, data: domainLayoutsCache[view]?.[domain] });
        });
      }
    } else if (layoutCache[view]) setLoaded({ key: wantedKey, data: layoutCache[view] });
    else {
      setLoaded({ key: wantedKey });
      const pending = view === 'tables-only'
        ? import('../generated/positions-tables-only.json')
        : import('../generated/positions-all-fields.json');
      pending.then((m) => {
        if (!cancelled) {
          layoutCache[view] = (m as { default: typeof positionsKeys }).default ?? positionsKeys;
          setLoaded({ key: wantedKey, data: layoutCache[view] });
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [view, domain, wantedKey]);
  return loaded.key === wantedKey ? loaded.data : undefined;
}

declare const __PUBLIC_MODE__: boolean;
const isPublic = typeof __PUBLIC_MODE__ !== 'undefined' && __PUBLIC_MODE__ === true;
const publicHostName = import.meta.env.VITE_HOST_NAME?.trim();
const publicHostUrl = import.meta.env.VITE_HOST_URL?.trim();

export default function App() {
  const { state, update } = useHashState();
  const layout = useLayout(state.view, state.domain);
  const [annotations, setAnnotations] = useState<{ version: number; project: string; annotations: { target: string; text: string; status: string; createdAt: string; updatedAt: string }[] } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    if (isPublic) return;
    governanceStore.load().then((d) => setAnnotations(d)).catch(() => setAnnotations(null));
  }, []);

  const selected = state.select ? decodeSelector(state.select) : null;
  const selectedLabel = selected ? selectorLabel(selected) : null;

  const nodes: Node[] = useMemo(() => {
    if (!layout) return [];
    const q = (state.q ?? '').toLowerCase();
    const visible = new Set(
      model.tables
        .filter((t) => {
          if (state.domain && t.domain !== state.domain) return false;
          if (q && !t.name.toLowerCase().includes(q) && !(t.note ?? '').toLowerCase().includes(q)) return false;
          return true;
        })
        .map((t) => t.name)
    );
    const neighbourhood = selected?.kind === 'table' ? neighbors(model as never, selected.table) : null;
    const comparedPath = selected?.kind === 'table' && state.compare ? findPath(model as never, selected.table, state.compare) : null;
    const pathTables = comparedPath?.found
      ? new Set(comparedPath.tables)
      : selected?.kind === 'table' && state.compare
        ? new Set([selected.table, state.compare])
        : null;

    return layout.tables
      .filter((t) => visible.has(t.name))
      .map((t) => {
        const faded = pathTables ? !pathTables.has(t.name) : neighbourhood ? !neighbourhood.tables.has(t.name) : false;
        const selectedNode = selected?.kind === 'table' && selected.table === t.name;
        const relMatch = selected?.kind === 'relationship' && (selected.fromTable === t.name || selected.toTable === t.name);
        return {
          id: t.name,
          type: 'tableNode',
          position: { x: (t as { x?: number }).x ?? 0, y: (t as { y?: number }).y ?? 0 },
          data: { table: t, view: state.view, selected: selectedNode || relMatch, faded },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          width: t.width,
          height: t.height,
          draggable: false,
          selectable: true,
          ariaDescribedBy: undefined,
          ariaLabel: `Table ${t.name}`,
        } as Node;
      });
  }, [layout, state.q, state.domain, state.compare, selected, state.view]);

  const edges: Edge[] = useMemo(() => {
    if (!layout) return [];
    const pathRelIds = new Set<string>();
    let pathResult: ReturnType<typeof findPath> | null = null;
    if (selected?.kind === 'table' && state.compare) pathResult = findPath(model as never, selected.table, state.compare);
    if (pathResult?.found) pathResult.relationships.forEach((id) => pathRelIds.add(id));

    return layout.edges.map((e) => {
      const fadedByPath = state.compare && pathResult?.found && !pathRelIds.has(e.id);
      const relationship = model.relationships.find((r) => r.id === e.id);
      const selectedEdge =
        selected?.kind === 'relationship' &&
        selected.fromTable === relationship?.from.table &&
        selected.toTable === relationship?.to.table;
      const isInPath = pathRelIds.has(e.id);
      const dim = fadedByPath ? 0.5 : 1;
      const referencedMultiplicity = e.nullable ? '0..1' : '1';
      const referencingMultiplicity = e.kind === 'one-to-one' ? '0..1' : '0..*';
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: selectedEdge ? `${referencedMultiplicity}  ${e.label}  ${referencingMultiplicity}` : undefined,
        type: 'routed',
        animated: isInPath,
        selected: selectedEdge,
        style: { stroke: isInPath ? 'var(--relationship-path)' : 'var(--relationship)', strokeWidth: isInPath ? 3.75 : selectedEdge ? 3.25 : 2.25, opacity: dim },
        ariaLabel: `Relationship ${e.id}`,
        data: {
          relationship,
          points: (e as { points?: { x: number; y: number }[] }).points,
          sourceMultiplicity: referencedMultiplicity,
          targetMultiplicity: referencingMultiplicity,
        },
      } as Edge;
    });
  }, [layout, selected, state.compare]);

  // Single source of truth for selection lives in the URL hash. When a node is
  // clicked:
  //   - no selection -> select this table
  //   - another table already selected and no compare -> make *this* the compare table
  //   - compare already set -> restart selection on the new table
  // This keeps deep links deterministic and avoids state loops from re-render.
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const tableName = node.id;
      if (selected?.kind === 'table') {
        if (selected.table === tableName) {
          update({ compare: undefined });
          return;
        }
        if (!state.compare) {
          update({ select: encodeSelector(selected), compare: tableName });
          return;
        }
      }
      update({ select: encodeSelector({ kind: 'table', table: tableName }), compare: undefined });
    },
    [selected, state.compare, update]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const rel = model.relationships.find((r) => r.id === edge.id);
      if (!rel) return;
      update({ select: encodeSelector({ kind: 'relationship', fromTable: rel.from.table, fromColumns: rel.from.columns, toTable: rel.to.table, toColumns: rel.to.columns }) });
    },
    [update]
  );

  const saveAnnotations = async () => {
    if (!annotations) return;
    setSaveStatus('Saving…');
    const ok = await governanceStore.save(annotations);
    setSaveStatus(ok ? 'Saved.' : 'Save failed.');
  };

  return (
    <div className="app">
      <header>
        <div className="titleRow">
          <h1>Data Model Workspace</h1>
          <span className="badge" title={isPublic ? 'Public read-only build' : 'Local governance mode'}>
            {isPublic ? 'Public — read-only' : 'Local — governance'}
          </span>
          {isPublic && publicHostName && publicHostUrl && (
            <a className="host-link" href={publicHostUrl}>← Back to {publicHostName}</a>
          )}
        </div>
        <nav aria-label="View and filters">
          <label>
            View
            <select value={state.view} onChange={(e) => update({ view: VIEW_MODES.find((m) => m === e.target.value) ?? 'keys' })} aria-label="View mode">
              <option value="tables-only">Tables only</option>
              <option value="keys">Keys & relationships</option>
              <option value="all-fields">All fields</option>
            </select>
          </label>
          <label>
            Search
            <input type="search" value={state.q ?? ''} onChange={(e) => update({ q: e.target.value || undefined, select: undefined, compare: undefined })} placeholder="Table or meaning…" aria-label="Search tables" />
          </label>
          <label>
            Domain
            <select value={state.domain ?? ''} onChange={(e) => update({ domain: e.target.value || undefined, select: undefined, compare: undefined })} aria-label="Filter by domain">
              <option value="">All domains</option>
              {model.domainOrder.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => update({ select: undefined, compare: undefined, q: undefined, domain: undefined })}>
            Reset
          </button>
          <span className="required-legend"><span className="tf-required" aria-hidden="true">*</span> Required</span>
        </nav>
        {selectedLabel && (
          <p className="selection">
            Selected: <strong>{selectedLabel}</strong>
            {state.compare && (
              <>
                {' '}
                · path to <code>{state.compare}</code>
              </>
            )}
          </p>
        )}
      </header>

      <main>
        <div className="canvas" role="application" aria-label="Schema graph">
          <div className="canvas-help" aria-hidden="true">Drag to move · Wheel or controls to zoom · Fit view ⛶</div>
          {layout ? (
            <ReactFlow
              key={`${state.view}:${state.domain ?? '*'}:${state.q ?? '*'}`}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodes={nodes}
              edges={edges}
              onNodesChange={undefined}
              onEdgesChange={undefined}
              onConnect={(_c: Connection) => undefined}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              fitView
              fitViewOptions={{ padding: 0.18, maxZoom: 1.2 }}
              minZoom={0.1}
              maxZoom={2}
              nodesConnectable={false}
              nodesDraggable={false}
              panOnScroll
              zoomOnScroll
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              edgesFocusable
              nodesFocusable
              elevateEdgesOnSelect
              colorMode="dark"
              proOptions={{ hideAttribution: false }}
              aria-label="Interactive data model"
            >
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable />
            </ReactFlow>
          ) : (
            <p>Loading layout…</p>
          )}
        </div>

        <aside className="details" aria-label="Details panel">
          <h2>Details</h2>
          <DetailsPanel selected={selected} compare={state.compare} />
          {!isPublic && (
            <section aria-label="Annotations">
              <h3>Annotations</h3>
              <AnnotationPanel selected={selectedLabel} selector={selected ? encodeSelector(selected) : null} annotations={annotations} setAnnotations={setAnnotations} onSave={saveAnnotations} saveStatus={saveStatus} />
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

function DetailsPanel({ selected, compare }: { selected: Selector | null; compare?: string }) {
  if (!selected) return <p>Select a table, field or relationship.</p>;
  if (selected.kind === 'field') return <FieldDetails table={selected.table} field={selected.field} />;
  if (selected.kind === 'relationship') return <RelationshipDetails selected={selected} />;
  return (
    <div>
      <TableDetails table={selected.table} />
      {compare && <PathPanel from={selected.table} compare={compare} />}
    </div>
  );
}

function TableDetails({ table }: { table: string }) {
  const t = model.tables.find((x) => x.name === table);
  const rels = model.relationships.filter((r) => r.from.table === table || r.to.table === table);
  if (!t) return <p>Unknown table.</p>;
  return (
    <div>
      <p>
        <strong>One row represents:</strong> {t.note ?? '—'}
      </p>
      <p>
        <strong>Domain:</strong> {t.domain ?? '—'}
      </p>
      <p>
        <strong>Fields</strong>
      </p>
      <div className="field-table-wrap">
        <table className="field-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Type / size</th>
              <th scope="col">Requirement</th>
              <th scope="col">Role</th>
              <th scope="col">Default / rules</th>
              <th scope="col">Meaning / populated by</th>
            </tr>
          </thead>
          <tbody>
            {t.fields.map((f) => {
              const type = splitDataType(f.type);
              const roles = [f.isPk ? 'PK' : '', f.isFk ? 'FK' : ''].filter(Boolean).join(' + ') || '—';
              const rules = [f.unique ? 'Unique' : '', f.default ? `Default: ${f.default}` : ''].filter(Boolean).join('; ') || '—';
              return (
                <tr key={f.name}>
                  <td title="Display label and API name"><strong>{displayFieldLabel(f.name)}</strong><code className="field-api-name">{f.name}</code></td>
                  <td><code>{type.name}</code>{type.size !== '—' && <small className="field-size">{type.size}</small>}</td>
                  <td>{f.notNull ? 'Required' : 'Optional'}</td>
                  <td>{roles}</td>
                  <td>{rules}</td>
                  <td>{f.note ?? 'Not yet documented'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        <strong>Connected tables</strong>
      </p>
      <ul>
        {Array.from(new Set(rels.map((r) => (r.from.table === table ? r.to.table : r.from.table)))).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

function splitDataType(type: string): { name: string; size: string } {
  const match = /^([^()]+)\(([^)]+)\)$/.exec(type);
  return match ? { name: match[1], size: match[2] } : { name: type, size: '—' };
}

function displayFieldLabel(name: string): string {
  const acronyms = new Set(['ai', 'api', 'id', 'ip', 'llm', 'mime', 'url']);
  return name
    .split('_')
    .map((part, index) => acronyms.has(part) ? part.toUpperCase() : index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function FieldDetails({ table, field }: { table: string; field: string }) {
  const t = model.tables.find((x) => x.name === table);
  const f = t?.fields.find((x) => x.name === field);
  if (!f) return <p>Unknown field.</p>;
  const rels = model.relationships.filter((r) => (r.from.table === table && r.from.columns.includes(field)) || (r.to.table === table && r.to.columns.includes(field)));
  return (
    <div>
      <p>
        <strong>{table}.{field}</strong> — {f.type}
      </p>
      <p>
        {f.isPk ? 'Primary key. ' : ''}
        {f.isFk ? 'Foreign key. ' : ''}
        {f.notNull ? 'Required.' : 'Optional.'}
      </p>
      {rels.length > 0 && (
        <>
          <p>
            <strong>Used in relationships</strong>
          </p>
          <ul>
            {rels.map((r) => (
              <li key={r.id}>
                {r.from.table}({r.from.columns.join(', ')}) → {r.to.table}({r.to.columns.join(', ')})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RelationshipDetails({ selected }: { selected: { kind: 'relationship'; fromTable: string; fromColumns: string[]; toTable: string; toColumns: string[] } }) {
  const rel = model.relationships.find((r) => r.from.table === selected.fromTable && r.to.table === selected.toTable);
  if (!rel) return <p>Unknown relationship.</p>;
  const referencedMultiplicity = rel.nullable ? '0..1' : '1';
  const referencingMultiplicity = rel.kind === 'one-to-one' ? '0..1' : '0..*';
  const childRange = rel.kind === 'one-to-one' ? 'zero or one' : 'zero or many';
  return (
    <div>
      <p>
        <strong>
          {rel.from.table}({rel.from.columns.join(', ')}) → {rel.to.table}({rel.to.columns.join(', ')})
        </strong>
      </p>
      <div className="cardinality-card" aria-label={`Cardinality: ${rel.to.table} ${referencedMultiplicity}, ${rel.from.table} ${referencingMultiplicity}`}>
        <div><strong>{rel.to.table}</strong><small>Referenced table</small></div>
        <span className="multiplicity-badge">{referencedMultiplicity}</span>
        <span aria-hidden="true">←</span>
        <span className="multiplicity-badge">{referencingMultiplicity}</span>
        <div><strong>{rel.from.table}</strong><small>Foreign-key table</small></div>
      </div>
      <p className="cardinality-legend"><strong>1</strong> exactly one · <strong>0..1</strong> zero or one · <strong>0..*</strong> zero or many</p>
      <div className="notation-legend" aria-label="Crow's Foot notation legend">
        <strong>Crow’s Foot legend</strong>
        <dl>
          <div><dt>||</dt><dd><strong>Exactly one:</strong> each case message belongs to one case.</dd></div>
          <div><dt>○|</dt><dd><strong>Zero or one:</strong> a case may reference one contact or none.</dd></div>
          <div><dt>|&lt;</dt><dd><strong>One or many:</strong> a future rule could require at least one child; a foreign key alone does not enforce this minimum.</dd></div>
          <div><dt>○&lt;</dt><dd><strong>Zero or many:</strong> a contact may have no cases or many cases.</dd></div>
        </dl>
      </div>
      <p>Each {rel.from.table} record {rel.nullable ? 'may reference zero or one' : 'must reference one'} {rel.to.table} record; one {rel.to.table} record can have {childRange} {rel.from.table} records.</p>
      <p><strong>Lifecycle classification:</strong> Not specified. Cardinality alone cannot determine an owned-child (“master-detail”) versus independent-reference (“lookup”) relationship.</p>
    </div>
  );
}

function PathPanel({ from, compare }: { from: string; compare: string }) {
  const result = findPath(model as never, from, compare);
  return (
    <div aria-live="polite" className="path">
      {result.found ? <p>Shortest path ({result.relationships.length} hop{result.relationships.length === 1 ? '' : 's'}): <strong>{result.tables.join(' → ')}</strong></p> : (
        <p>{result.reason === 'no-path' ? 'No relationship path exists.' : result.reason === 'same-table' ? 'Select a different second table.' : 'Unknown table.'}</p>
      )}
    </div>
  );
}

type AnnotationStore = { version: number; project: string; annotations: { target: string; text: string; status: string; createdAt: string; updatedAt: string }[] };

function AnnotationPanel({ selected, selector, annotations, setAnnotations, onSave, saveStatus }: { selected: string | null; selector: string | null; annotations: AnnotationStore | null; setAnnotations: (v: AnnotationStore) => void; onSave: () => void; saveStatus: string }) {
  const [text, setText] = useState('');
  if (!annotations) return <p>Annotations unavailable in this build.</p>;
  const target = selected ?? 'No selection';
  return (
    <div>
      <p>
        <strong>Target:</strong> <code>{target}</code>
      </p>
      <label>
        Note
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={selector ? 'Add review note…' : 'Select a table/field/relationship first'} disabled={!selector} aria-label="Annotation text" />
      </label>
      <button
        type="button"
        onClick={() => {
          if (!selector || !text.trim()) return;
          const now = new Date().toISOString();
          setAnnotations({ ...annotations, annotations: [...annotations.annotations, { target: selector, text: text.trim(), status: 'open', createdAt: now, updatedAt: now }] });
          setText('');
        }}
        disabled={!selector || !text.trim()}
      >
        Add
      </button>
      <ul>
        {annotations.annotations.map((a, i) => (
          <li key={i}>
            <code>{a.target}</code> — {a.text} <em>({a.status})</em>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onSave}>
        Save annotations
      </button>
      <span className="muted" role="status">{saveStatus}</span>
    </div>
  );
}
