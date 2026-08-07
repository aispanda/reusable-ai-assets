import type { DataModel, TableModel } from './model';
import { projectTable, type ViewMode } from './views';

export interface Position {
  x: number;
  y: number;
}

export interface LayoutSpecTable {
  name: string;
  note?: string;
  domain?: string;
  headerColor?: string;
  fields: { name: string; isPk: boolean; isFk: boolean; notNull: boolean; type?: string }[];
  width: number;
  height: number;
  noteHeight: number;
}

export interface LayoutSpec {
  mode: ViewMode;
  tables: LayoutSpecTable[];
  edges: LayoutSpecEdge[];
}

export interface LayoutSpecEdge {
  id: string;
  /** React Flow node ids (same as table names). */
  source: string;
  target: string;
  /** Precomputed label shown on the edge. */
  label: string;
  /** For details panel. */
  from: { table: string; columns: string[]; relation: string };
  to: { table: string; columns: string[]; relation: string };
  kind: string;
  composite: boolean;
  nullable: boolean;
}

const NODE_MIN_WIDTH = 200;
const NODE_MAX_WIDTH = 360;
const FIELD_ROW_HEIGHT = 24;
const HEADER_HEIGHT = 56;
const FIELD_LIST_VERTICAL_PADDING = 16;
const NODE_BORDER_ALLOWANCE = 2;
const H_PADDING = 24;

function estimateTextWidth(text: string): number {
  // Rough monospace estimate; deterministic so layout tests are stable.
  return text.length * 8 + H_PADDING;
}

function estimateNoteHeight(note: string, width: number): number {
  const text = `One row represents: ${note}`;
  const charsPerLine = Math.max(20, Math.floor((width - 20) / 7));
  const words = text.split(/\s+/);
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const next = used === 0 ? word.length : used + 1 + word.length;
    if (next > charsPerLine) {
      lines += 1;
      used = word.length;
    } else used = next;
  }
  return 16 + (lines + 1) * 16;
}

function tableDimensions(table: TableModel, mode: ViewMode): { width: number; height: number; noteHeight: number } {
  const view = projectTable(table, mode);
  const labels = view.fields.map((f) => {
    const markerWidth = (f.isPk ? 28 : 0) + (f.isFk ? 28 : 0) + (f.notNull ? 12 : 0);
    return { text: f.label + (f.type ? ` ${f.type}` : ''), markerWidth };
  });
  const widest = labels.length > 0 ? Math.max(...labels.map((label) => estimateTextWidth(label.text) + label.markerWidth)) : 0;
  const width = Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, Math.ceil(Math.max(estimateTextWidth(table.name), widest))));
  const fieldsHeight = view.fields.length > 0 ? FIELD_LIST_VERTICAL_PADDING + view.fields.length * FIELD_ROW_HEIGHT : 0;
  const noteHeight = mode === 'all-fields' && table.note ? estimateNoteHeight(table.note, width) : 0;
  const height = HEADER_HEIGHT + noteHeight + fieldsHeight + NODE_BORDER_ALLOWANCE;
  return { width, height, noteHeight };
}

/** Build the layout-ready spec for a view. */
export function buildLayoutSpec(model: DataModel, mode: ViewMode): LayoutSpec {
  const tables: LayoutSpecTable[] = model.tables.map((t) => {
    const view = projectTable(t, mode);
    const dims = tableDimensions(t, mode);
    return {
      name: t.name,
      note: t.note,
      domain: t.domain,
      headerColor: t.headerColor,
      fields: view.fields,
      width: dims.width,
      height: dims.height,
      noteHeight: dims.noteHeight,
    };
  });

  const edges: LayoutSpecEdge[] = buildEdgeSpecs(model);

  return { mode, tables, edges };
}

/** Stable edge labels used across all views (kept identical so switching views never moves labels). */
export function buildEdgeSpecs(model: DataModel): LayoutSpecEdge[] {
  return model.relationships.map((r) => {
    const label = r.composite
      ? `${r.to.columns.join(' + ')} ← ${r.from.columns.join(' + ')}`
      : `${r.to.columns[0]} ← ${r.from.columns[0]}`;
    return {
      id: r.id,
      source: r.to.table,
      target: r.from.table,
      label,
      from: r.from,
      to: r.to,
      kind: r.kind,
      composite: r.composite,
      nullable: r.nullable,
    };
  });
}
