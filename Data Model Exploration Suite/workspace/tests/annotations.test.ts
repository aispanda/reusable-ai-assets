import { describe, it, expect } from 'vitest';
import { makeAnnotation, validateAnnotations, serializeAnnotations, parseAnnotations } from '../src/lib/annotations';
import { makeResolve } from '../src/lib/annotations-io';
import { loadModel, expectValidModel } from './fixtures';

describe('annotations', () => {
  it('creates and persists annotations (versioned JSON)', () => {
    const { model } = loadModel();
    expectValidModel(model);
    const a = makeAnnotation({ kind: 'field', table: 'support_tickets', field: 'subject' }, 'Review requiredness');
    const file = { version: 1 as const, project: 'test', annotations: [a] };
    const serialized = serializeAnnotations(file);
    const parsed = parseAnnotations(serialized);
    expect(parsed.version).toBe(1);
    expect(parsed.annotations[0].target).toBe('field:support_tickets.subject');
    expect(parsed.annotations[0].text).toBe('Review requiredness');
    expect(parsed.annotations[0].status).toBe('open');
  });

  it('round-trips through the resolver without orphans when schema is unchanged', () => {
    const { model } = loadModel();
    const file = {
      version: 1 as const,
      project: 'test',
      annotations: [
        makeAnnotation({ kind: 'table', table: 'organizations' }, 'Organization note'),
        makeAnnotation({ kind: 'relationship', fromTable: 'support_tickets', fromColumns: ['organization_id'], toTable: 'organizations', toColumns: ['id'] }, 'Relationship check'),
      ],
    };
    const report = validateAnnotations(model, file, makeResolve(model));
    expect(report.valid).toHaveLength(2);
    expect(report.orphans).toHaveLength(0);
  });

  it('reports orphans when a field is renamed or removed', () => {
    const { model } = loadModel();
    const renamed = makeAnnotation({ kind: 'field', table: 'support_tickets', field: 'new_subject' }, 'old name');
    const missingTable = makeAnnotation({ kind: 'field', table: 'dropped_table', field: 'anything' }, 'gone');
    const file = { version: 1 as const, project: 'test', annotations: [renamed, missingTable] };
    const report = validateAnnotations(model, file, makeResolve(model));
    expect(report.valid).toHaveLength(0);
    expect(report.orphans).toHaveLength(2);
    expect(report.orphans.find((o) => o.annotation.target.includes('new_subject'))?.reason).toBe('field-missing');
    expect(report.orphans.find((o) => o.annotation.target.includes('dropped_table'))?.reason).toBe('table-missing');
  });

  it('rejects corrupt or wrong-version files with readable errors', () => {
    expect(() => parseAnnotations('not json')).toThrow(/not valid JSON/i);
    expect(() => parseAnnotations(JSON.stringify({ version: 2, annotations: [] }))).toThrow(/version/i);
    expect(() => parseAnnotations(JSON.stringify({ version: 1 }))).toThrow(/annotations array/i);
  });
});
