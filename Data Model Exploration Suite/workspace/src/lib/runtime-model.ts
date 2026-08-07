import type { DataModel, TableModel, RelationshipModel, FieldModel } from './model';
import modelJson from '../../generated/model.json';

interface RawField {
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  notNull: boolean;
  unique?: boolean;
  default?: string | null;
  note?: string;
}

interface RawTable {
  name: string;
  note?: string;
  headerColor?: string;
  domain?: string;
  fields: RawField[];
  pkColumns?: string[];
}

interface RawRelationship {
  id: string;
  from: { table: string; columns: string[]; relation: string };
  to: { table: string; columns: string[]; relation: string };
  kind: string;
  composite: boolean;
  nullable: boolean;
}

interface RawModel {
  projectNote?: string;
  tables: RawTable[];
  relationships: RawRelationship[];
  domainOrder: string[];
}

/** Reconstruct the full DataModel (including tableByName Map) from generated JSON. */
export function loadRuntimeModel(): DataModel {
  const raw = modelJson as unknown as RawModel;
  const tableByName = new Map<string, TableModel>();
  const tables: TableModel[] = raw.tables.map((t) => {
    const fields: FieldModel[] = t.fields.map((f) => ({
      name: f.name,
      type: f.type,
      isPk: f.isPk,
      isFk: f.isFk,
      notNull: f.notNull,
      unique: f.unique ?? false,
      default: f.default ?? null,
      note: f.note,
    }));
    const table: TableModel = {
      name: t.name,
      note: t.note,
      headerColor: t.headerColor,
      domain: t.domain,
      fields,
      pkColumns: t.pkColumns ?? fields.filter((f) => f.isPk).map((f) => f.name),
    };
    tableByName.set(table.name, table);
    return table;
  });
  const relationships: RelationshipModel[] = raw.relationships.map((r) => ({
    id: r.id,
    from: { table: r.from.table, columns: r.from.columns, relation: r.from.relation },
    to: { table: r.to.table, columns: r.to.columns, relation: r.to.relation },
    kind: r.kind as RelationshipModel['kind'],
    composite: r.composite,
    nullable: r.nullable,
  }));
  return {
    projectNote: raw.projectNote,
    tables,
    relationships,
    tableByName,
    domainOrder: raw.domainOrder,
  };
}

export const runtimeModel = loadRuntimeModel();
