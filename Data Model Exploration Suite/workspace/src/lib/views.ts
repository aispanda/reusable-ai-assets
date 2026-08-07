import type { DataModel, FieldModel, TableModel } from './model';

export type ViewMode = 'tables-only' | 'keys' | 'all-fields';

export const VIEW_MODES: ViewMode[] = ['tables-only', 'keys', 'all-fields'];
export const DEFAULT_VIEW: ViewMode = 'keys';

export interface ViewField {
  name: string;
  label: string;
  isPk: boolean;
  isFk: boolean;
  notNull: boolean;
  type?: string;
}

export interface ViewTable {
  name: string;
  note?: string;
  domain?: string;
  headerColor?: string;
  fields: ViewField[];
  fieldCount: number;
}

/** Project one table into a view. */
export function projectTable(table: TableModel, mode: ViewMode): ViewTable {
  const base = {
    name: table.name,
    note: table.note,
    domain: table.domain,
    headerColor: table.headerColor,
    fieldCount: table.fields.length,
  };
  switch (mode) {
    case 'tables-only':
      return { ...base, fields: [] };
    case 'keys': {
      const keys = table.fields.filter((f) => f.isPk || f.isFk).map((f) => toViewField(f, false));
      return { ...base, fields: keys };
    }
    case 'all-fields': {
      return { ...base, fields: table.fields.map((f) => toViewField(f, true)) };
    }
  }
}

function toViewField(f: FieldModel, includeType: boolean): ViewField {
  return {
    name: f.name,
    label: f.name,
    isPk: f.isPk,
    isFk: f.isFk,
    notNull: f.notNull,
    type: includeType ? f.type : undefined,
  };
}

/** Project the whole model for a view. */
export function projectModel(model: DataModel, mode: ViewMode): ViewTable[] {
  return model.tables.map((t) => projectTable(t, mode));
}
