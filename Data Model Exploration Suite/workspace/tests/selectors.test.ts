import { describe, it, expect } from 'vitest';
import { encodeSelector, decodeSelector, resolveSelector, selectorLabel } from '../src/lib/selectors';
import { loadModel, expectValidModel } from './fixtures';

describe('stable selectors', () => {
  it('round-trips table selectors', () => {
    const selector = { kind: 'table' as const, table: 'support_tickets' };
    expect(decodeSelector(encodeSelector(selector))).toEqual(selector);
    expect(selectorLabel(selector)).toContain('support_tickets');
  });

  it('round-trips field selectors', () => {
    const selector = { kind: 'field' as const, table: 'contacts', field: 'email' };
    expect(decodeSelector(encodeSelector(selector))).toEqual(selector);
  });

  it('round-trips composite relationship selectors', () => {
    const selector = {
      kind: 'relationship' as const,
      fromTable: 'children',
      fromColumns: ['parent_id', 'tenant_id'],
      toTable: 'parents',
      toColumns: ['id', 'tenant_id'],
    };
    expect(decodeSelector(encodeSelector(selector))).toEqual(selector);
  });

  it('resolves against the live model', () => {
    const { model } = loadModel();
    expectValidModel(model);
    expect(resolveSelector(model, { kind: 'table', table: 'organizations' })).toBeTruthy();
    expect(resolveSelector(model, { kind: 'field', table: 'organizations', field: 'name' })).toBeTruthy();
    expect(resolveSelector(model, { kind: 'relationship', fromTable: 'contacts', fromColumns: ['organization_id'], toTable: 'organizations', toColumns: ['id'] })).toBeTruthy();
  });

  it('returns null for removed targets', () => {
    const { model } = loadModel();
    expect(resolveSelector(model, { kind: 'table', table: 'renamed_table' })).toBeNull();
    expect(resolveSelector(model, { kind: 'field', table: 'organizations', field: 'missing' })).toBeNull();
  });
});
