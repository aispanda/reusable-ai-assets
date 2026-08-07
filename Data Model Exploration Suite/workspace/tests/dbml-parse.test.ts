import { describe, it, expect } from 'vitest';
import { parseDbml } from '../src/lib/dbml-parse';
import { loadCanonicalDbml } from './fixtures';

describe('dbmlv2 parsing', () => {
  it('parses the canonical schema natively', () => {
    const parsed = parseDbml(loadCanonicalDbml());
    expect(parsed.tables.length).toBe(9);
    expect(parsed.refs.length).toBe(10);
    expect(parsed.enums.length).toBe(4);
    expect(parsed.tableGroups.length).toBe(3);
  });

  it('expands TablePartial (~tenant_record) into governed tables', () => {
    const parsed = parseDbml(`
      TablePartial governed_record {
        id uuid [pk, not null]
        created_at timestamptz [not null]
      }
      Table items {
        ~governed_record
        label text [not null]
      }
    `);
    const t = parsed.tables.find((x) => x.name === 'items');
    expect(t).toBeDefined();
    const names = t!.columns.map((c) => c.name);
    // partial-provided columns
    expect(names).toContain('id');
    expect(names).toContain('created_at');
    // own columns
    expect(names).toContain('label');
    expect(t!.columns.find((c) => c.name === 'id')?.pk).toBe(true);
    expect(t!.columns.find((c) => c.name === 'created_at')?.notNull).toBe(true);
  });

  it('preserves composite foreign keys with direction', () => {
    const parsed = parseDbml(`
      Table parents {
        tenant_id uuid [not null]
        id uuid [not null]
        indexes { (tenant_id, id) [pk] }
      }
      Table children {
        tenant_id uuid [not null]
        parent_id uuid [not null]
      }
      Ref: children.(tenant_id, parent_id) > parents.(tenant_id, id)
    `);
    const comp = parsed.refs[0];
    expect(comp).toBeDefined();
    const from = comp!.endpoints.find((e) => e.table === 'children')!;
    const to = comp!.endpoints.find((e) => e.table === 'parents')!;
    expect(from.columns).toEqual(['tenant_id', 'parent_id']);
    expect(to.columns).toEqual(['tenant_id', 'id']);
    expect(from.relation).toBe('*');
    expect(to.relation).toBe('1');
  });

  it('preserves headerColor and Note metadata', () => {
    const parsed = parseDbml(loadCanonicalDbml());
    const support = parsed.tables.find((x) => x.name === 'support_tickets');
    expect(support?.headerColor).toBe('#2563EB');
    expect(support?.note).toMatch(/authoritative fictional customer-support request/i);
  });

  it('reports parse errors with line/column for invalid DBML', () => {
    const bad = 'Table t {\n  id uuid [pk,\n}\n';
    expect(() => parseDbml(bad)).toThrow(/parse error|syntax|expected/i);
  });
});
