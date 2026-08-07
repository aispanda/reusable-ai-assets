import { describe, it, expect } from 'vitest';
import { projectTable, projectModel } from '../src/lib/views';
import { loadModel, expectValidModel } from './fixtures';

describe('view projections', () => {
  it('tables-only hides all fields', () => {
    const { model } = loadModel();
    expectValidModel(model);
    const table = model.tableByName.get('support_tickets')!;
    const view = projectTable(table, 'tables-only');
    expect(view.fields).toHaveLength(0);
    expect(view.fieldCount).toBe(table.fields.length);
  });

  it('keys view shows only PK/FK columns', () => {
    const { model } = loadModel();
    const view = projectTable(model.tableByName.get('support_tickets')!, 'keys');
    const names = view.fields.map((field) => field.name);
    expect(names).toContain('id');
    expect(names).toContain('organization_id');
    expect(names).toContain('assigned_agent_id');
    expect(names).not.toContain('description');
  });

  it('all-fields view preserves types', () => {
    const { model } = loadModel();
    const table = model.tableByName.get('ai_suggestions')!;
    const view = projectTable(table, 'all-fields');
    expect(view.fields.length).toBe(table.fields.length);
    expect(view.fields.every((field) => field.type !== undefined)).toBe(true);
    expect(view.fields.find((field) => field.name === 'proposed_category')?.type).toContain('varchar');
  });

  it('projects every table without reparsing', () => {
    const { model } = loadModel();
    const tables = projectModel(model, 'keys');
    expect(tables.length).toBe(9);
    expect(tables.every((table) => typeof table.name === 'string')).toBe(true);
  });
});
