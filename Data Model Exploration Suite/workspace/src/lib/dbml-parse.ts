import { Parser } from '@dbml/core';

export type Cardinality = 'one' | 'many' | 'one-or-many' | 'zero-or-one' | 'zero-or-many';

export interface DbmlColumn {
  name: string;
  type: string;
  notNull?: boolean;
  pk?: boolean;
  unique?: boolean;
  default?: string | null;
  note?: string;
}

export interface DbmlTable {
  name: string;
  note?: string;
  headerColor?: string;
  columns: DbmlColumn[];
}

export interface DbmlRefEndpoint {
  table: string;
  columns: string[];
  relation: string; // raw relation marker from DBML: '1', '*', '-', etc.
}

export interface DbmlRef {
  name?: string;
  endpoints: [DbmlRefEndpoint, DbmlRefEndpoint];
}

export interface DbmlEnum {
  name: string;
  values: string[];
}

export interface DbmlTableGroup {
  name: string;
  tableNames: string[];
}

export interface ParsedDbml {
  tables: DbmlTable[];
  refs: DbmlRef[];
  enums: DbmlEnum[];
  tableGroups: DbmlTableGroup[];
  projectNote?: string;
}

export interface ParseOptions {
  /**
   * Parser dialect. The project uses `dbmlv2` natively so `TablePartial` and
   * other modern DBML constructs are handled by @dbml/core without loss.
   */
  format?: 'dbmlv2' | 'dbml';
}

/**
 * Parse DBML text into a normalized structure.
 *
 * Failures from @dbml/core are surfaced with the original line/column where
 * possible so users can fix the canonical source.
 */
export function parseDbml(source: string, options: ParseOptions = {}): ParsedDbml {
  const format = options.format ?? 'dbmlv2';
  const parser = new Parser();
  let db: unknown;
  try {
    db = parser.parse(source, format);
  } catch (err) {
    throw normalizeParseError(err, source);
  }

  return mapDatabase(db);
}

interface RawEndpoint {
  schemaName?: string;
  tableName: string;
  fieldNames?: string[];
  relation: string;
}

interface RawRef {
  name?: string;
  endpoints: RawEndpoint[];
}

function mapDatabase(db: unknown): ParsedDbml {
  const root = db as { schemas?: Array<Record<string, unknown>>; tableGroups?: unknown[] };
  const schema = root.schemas?.[0] ?? {};

  const tables = mapTables((schema as { tables?: unknown[] }).tables ?? []);
  const refs = mapRefs((schema as { refs?: unknown[] }).refs ?? []);
  const enums = mapEnums((schema as { enums?: unknown[] }).enums ?? []);
  const tableGroups = mapTableGroups(root.tableGroups ?? (schema as { tableGroups?: unknown[] }).tableGroups ?? []);

  return { tables, refs, enums, tableGroups };
}

function mapTables(tables: unknown[]): DbmlTable[] {
  return tables.map((t) => {
    const table = t as Record<string, unknown>;
    const fields = Array.isArray(table.fields) ? table.fields : [];
    return {
      name: String(table.name),
      note: table.note == null ? undefined : String(table.note),
      headerColor: table.headerColor == null ? undefined : String(table.headerColor),
      columns: fields.map((f) => {
        const field = f as Record<string, unknown>;
        const type = field.type as Record<string, unknown> | undefined;
        return {
          name: String(field.name),
          type: type?.type_name != null ? String(type.type_name) : String(field.type ?? ''),
          notNull: field.not_null === true,
          pk: field.pk === true,
          unique: field.unique === true,
          default: field.dbdefault == null ? null : String((field.dbdefault as Record<string, unknown>)?.value ?? field.dbdefault),
          note: field.note == null ? undefined : String(field.note),
        };
      }),
    };
  });
}

function mapRefs(refs: unknown[]): DbmlRef[] {
  return refs.map((r) => {
    const ref = r as RawRef;
    const endpoints = ref.endpoints.slice(0, 2) as RawEndpoint[];
    return {
      name: ref.name,
      endpoints: [
        {
          table: endpoints[0].tableName,
          columns: endpoints[0].fieldNames ?? [],
          relation: endpoints[0].relation,
        },
        {
          table: endpoints[1].tableName,
          columns: endpoints[1].fieldNames ?? [],
          relation: endpoints[1].relation,
        },
      ],
    };
  });
}

function mapEnums(enums: unknown[]): DbmlEnum[] {
  return enums.map((e) => {
    const en = e as { name: string; values?: Array<{ name: string }> };
    return {
      name: String(en.name),
      values: (en.values ?? []).map((v) => String(v.name)),
    };
  });
}

function mapTableGroups(groups: unknown[]): DbmlTableGroup[] {
  return groups.map((g) => {
    const group = g as { name: string; tables?: Array<{ name: string }> };
    return {
      name: String(group.name),
      tableNames: (group.tables ?? []).map((t) => String(t.name)),
    };
  });
}

function normalizeParseError(err: unknown, source: string): Error {
  const diags = (err as { diags?: Array<{ message?: string; location?: { start?: { line?: number; column?: number } } }> })
    ?.diags;
  const first = diags?.[0];
  if (first?.location?.start) {
    const { line, column } = first.location.start;
    const preview = source.split(/\r?\n/)[(line ?? 1) - 1]?.trim();
    return new Error(`DBML parse error at ${line}:${column}: ${first.message ?? 'Invalid syntax'}${preview ? ` near "${preview}"` : ''}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}
