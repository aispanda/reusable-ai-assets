import type { DataModel, TableModel, FieldModel, RelationshipModel } from './model';

/**
 * Stable selectors identify exact schema items across regenerations so
 * annotations and deep links survive column renames/reorders. Format:
 *   table:<tableName>
 *   field:<tableName>.<fieldName>
 *   rel:<fromTable>.<fromCol>+<fromCol2>→<toTable>.<toCol>+<toCol2>
 */
export type Selector =
  | { kind: 'table'; table: string }
  | { kind: 'field'; table: string; field: string }
  | { kind: 'relationship'; fromTable: string; fromColumns: string[]; toTable: string; toColumns: string[] };

export function encodeSelector(sel: Selector): string {
  switch (sel.kind) {
    case 'table':
      return `table:${sel.table}`;
    case 'field':
      return `field:${sel.table}.${sel.field}`;
    case 'relationship': {
      const fromCols = [...sel.fromColumns].sort();
      const toCols = [...sel.toColumns].sort();
      return `rel:${sel.fromTable}.${fromCols.join('+')}→${sel.toTable}.${toCols.join('+')}`;
    }
  }
}

export function decodeSelector(text: string): Selector | null {
  const tableMatch = /^table:(.+)$/.exec(text);
  if (tableMatch) return { kind: 'table', table: tableMatch[1] };
  const fieldMatch = /^field:([^.]+)\.([^.]+)$/.exec(text);
  if (fieldMatch) return { kind: 'field', table: fieldMatch[1], field: fieldMatch[2] };
  const relMatch = /^rel:([^.]+)\.([^→]+)→([^.]+)\.(.+)$/.exec(text);
  if (relMatch) {
    return {
      kind: 'relationship',
      fromTable: relMatch[1],
      fromColumns: relMatch[2].split('+'),
      toTable: relMatch[3],
      toColumns: relMatch[4].split('+'),
    };
  }
  return null;
}

/** Resolve a selector against the live model. Returns the matched model item or null. */
export function resolveSelector(
  model: DataModel,
  sel: Selector
): { table?: TableModel; field?: FieldModel; relationship?: RelationshipModel } | null {
  switch (sel.kind) {
    case 'table': {
      const table = model.tableByName.get(sel.table);
      return table ? { table } : null;
    }
    case 'field': {
      const table = model.tableByName.get(sel.table);
      if (!table) return null;
      const field = table.fields.find((f) => f.name === sel.field);
      return field ? { table, field } : null;
    }
    case 'relationship': {
      const rel = model.relationships.find(
        (r) =>
          r.from.table === sel.fromTable &&
          r.to.table === sel.toTable &&
          sameSet(r.from.columns, sel.fromColumns) &&
          sameSet(r.to.columns, sel.toColumns)
      );
      return rel ? { relationship: rel } : null;
    }
  }
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

/** Human-readable label for a selector. */
export function selectorLabel(sel: Selector): string {
  switch (sel.kind) {
    case 'table':
      return `Table ${sel.table}`;
    case 'field':
      return `${sel.table}.${sel.field}`;
    case 'relationship':
      return `${sel.fromTable}(${sel.fromColumns.join(', ')}) → ${sel.toTable}(${sel.toColumns.join(', ')})`;
  }
}
