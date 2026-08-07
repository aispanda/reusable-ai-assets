import { parseDbml, type ParsedDbml, type DbmlRefEndpoint } from './dbml-parse';

export type RelationshipKind = 'one-to-many' | 'one-to-one' | 'many-to-one' | 'zero-or-one-to-many' | 'many-to-zero-or-one' | 'zero-or-one-to-zero-or-one';

export interface FieldModel {
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  notNull: boolean;
  unique: boolean;
  default: string | null;
  note?: string;
}

export interface TableModel {
  name: string;
  /** Canonical row meaning from the DBML `Note:` of the table. */
  note?: string;
  headerColor?: string;
  /** TableGroup / domain this table belongs to, if any. */
  domain?: string;
  fields: FieldModel[];
  pkColumns: string[];
}

export interface RelationshipModel {
  /** Stable logical id: `${left.table}→${right.table}` for pair refs. */
  id: string;
  /** Endpoint that refers to (FK side). */
  from: DbmlRefEndpoint;
  /** Endpoint that is referred to (PK/referenced side). */
  to: DbmlRefEndpoint;
  kind: RelationshipKind;
  /** Composite relationship (more than one column per side). */
  composite: boolean;
  /** True when the FK side is nullable (from column may be NULL). */
  nullable: boolean;
}

export interface DataModel {
  projectNote?: string;
  tables: TableModel[];
  relationships: RelationshipModel[];
  tableByName: Map<string, TableModel>;
  domainOrder: string[];
}

export interface ModelValidationIssue {
  code:
    | 'no-tables'
    | 'table-missing-note'
    | 'table-missing-pk'
    | 'ref-unknown-table'
    | 'ref-unknown-field'
    | 'duplicate-table'
    | 'duplicate-field'
    | 'duplicate-selector';
  message: string;
  context?: Record<string, string>;
}

/** Parse DBML and build the canonical in-memory model. Throws on invalid DBML. */
export function buildModel(dbmlSource: string): DataModel {
  const parsed = parseDbml(dbmlSource);
  return buildModelFromParsed(parsed);
}

export function buildModelFromParsed(parsed: ParsedDbml): DataModel {
  const tableByName = new Map<string, TableModel>();
  const tables: TableModel[] = [];

  // Domain membership from TableGroups (preserve canonical order).
  const domainByTable = new Map<string, string>();
  const domainOrder: string[] = [];
  for (const group of parsed.tableGroups) {
    domainOrder.push(group.name);
    for (const tn of group.tableNames) {
      // First domain wins if a table appears twice.
      if (!domainByTable.has(tn)) domainByTable.set(tn, group.name);
    }
  }

  // Collect FK column names by table to mark fields.
  const fkByTable = new Map<string, Set<string>>();
  for (const ref of parsed.refs) {
    for (const endpoint of ref.endpoints) {
      for (const col of endpoint.columns) {
        if (!fkByTable.has(endpoint.table)) fkByTable.set(endpoint.table, new Set());
        fkByTable.get(endpoint.table)!.add(col);
      }
    }
  }

  for (const t of parsed.tables) {
    if (tableByName.has(t.name)) continue; // duplicate handled in validation
    const fkSet = fkByTable.get(t.name) ?? new Set<string>();
    const pkColumns = t.columns.filter((c) => c.pk).map((c) => c.name);
    const fields: FieldModel[] = t.columns.map((c) => ({
      name: c.name,
      type: c.type,
      isPk: c.pk === true,
      isFk: fkSet.has(c.name),
      notNull: c.notNull === true,
      unique: c.unique === true,
      default: c.default ?? null,
      note: c.note,
    }));
    const table: TableModel = {
      name: t.name,
      note: t.note,
      headerColor: t.headerColor,
      domain: domainByTable.get(t.name),
      fields,
      pkColumns,
    };
    tables.push(table);
    tableByName.set(t.name, table);
  }

  const relationships: RelationshipModel[] = parsed.refs.map((ref) => {
    const [a, b] = ref.endpoints;
    // In DBML `a > b`, `a` is many, `b` is one. Normalize to FK-side `from` → PK-side `to`.
    const from = a.relation === '*' ? a : b;
    const to = a.relation === '*' ? b : a;
    const fromTable = tableByName.get(from.table);
    const nullable = isNullableFk(fromTable, from.columns);
    return {
      id: `${from.table}→${to.table}`,
      from,
      to,
      kind: cardinalityKind(from.relation, to.relation),
      composite: from.columns.length > 1 || to.columns.length > 1,
      nullable,
    };
  });

  return {
    projectNote: parsed.projectNote,
    tables,
    relationships,
    tableByName,
    domainOrder,
  };
}

function isNullableFk(table: TableModel | undefined, cols: string[]): boolean {
  if (!table) return false;
  return cols.some((name) => {
    const f = table.fields.find((x) => x.name === name);
    return f ? !f.notNull : false;
  });
}

function cardinalityKind(fromRelation: string, toRelation: string): RelationshipKind {
  const oneFrom = fromRelation === '1';
  const oneTo = toRelation === '1';
  if (oneFrom && oneTo) return 'one-to-one';
  if (oneFrom && !oneTo) return 'many-to-one';
  if (!oneFrom && oneTo) return 'one-to-many';
  return 'one-to-many';
}

/** Validate the model against brief rules. Returns issues; empty array = valid. */
export function validateModel(model: DataModel, parsed?: ParsedDbml): ModelValidationIssue[] {
  const issues: ModelValidationIssue[] = [];
  if (model.tables.length === 0) {
    issues.push({ code: 'no-tables', message: 'DBML contains no tables.' });
    return issues;
  }

  // Duplicate tables / fields.
  const seenTable = new Set<string>();
  for (const t of model.tables) {
    if (seenTable.has(t.name)) {
      issues.push({ code: 'duplicate-table', message: `Duplicate table '${t.name}'.`, context: { table: t.name } });
    }
    seenTable.add(t.name);
    const seenField = new Set<string>();
    for (const f of t.fields) {
      if (seenField.has(f.name)) {
        issues.push({ code: 'duplicate-field', message: `Table '${t.name}' has duplicate field '${f.name}'.`, context: { table: t.name, field: f.name } });
      }
      seenField.add(f.name);
    }
  }

  // Table-level business rules.
  for (const t of model.tables) {
    if (!t.note || t.note.trim().length === 0) {
      issues.push({ code: 'table-missing-note', message: `Table '${t.name}' lacks a canonical Note.`, context: { table: t.name } });
    }
    if (t.pkColumns.length === 0) {
      issues.push({ code: 'table-missing-pk', message: `Table '${t.name}' has no primary key.`, context: { table: t.name } });
    }
  }

  // Reference integrity.
  for (const r of model.relationships) {
    for (const ep of [r.from, r.to]) {
      const table = model.tableByName.get(ep.table);
      if (!table) {
        issues.push({ code: 'ref-unknown-table', message: `Ref '${r.id}' targets unknown table '${ep.table}'.`, context: { ref: r.id, table: ep.table } });
        continue;
      }
      for (const col of ep.columns) {
        if (!table.fields.some((f) => f.name === col)) {
          issues.push({ code: 'ref-unknown-field', message: `Ref '${r.id}' targets missing field '${ep.table}.${col}'.`, context: { ref: r.id, field: `${ep.table}.${col}` } });
        }
      }
    }
  }

  // Duplicate selectors: same logical ref used twice confusingly (same from/to).
  const pairSeen = new Set<string>();
  for (const r of model.relationships) {
    const key = `${r.from.table}(${r.from.columns.join(',')})>${r.to.table}(${r.to.columns.join(',')})`;
    if (pairSeen.has(key)) {
      issues.push({ code: 'duplicate-selector', message: `Duplicate relationship selector '${key}'.`, context: { ref: r.id } });
    }
    pairSeen.add(key);
  }

  // If parsed supplied, validate that tableGroup tableNames exist.
  if (parsed) {
    const realTables = new Set(model.tables.map((t) => t.name));
    for (const g of parsed.tableGroups) {
      for (const tn of g.tableNames) {
        if (!realTables.has(tn)) {
          issues.push({ code: 'ref-unknown-table', message: `TableGroup '${g.name}' references missing table '${tn}'.`, context: { group: g.name, table: tn } });
        }
      }
    }
  }

  return issues;
}
