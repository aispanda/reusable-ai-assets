import { describe, it, expect } from 'vitest';
import { findPath, neighbors } from '../src/lib/graph';
import { loadModel, expectValidModel } from './fixtures';

describe('graph traversal', () => {
  it('finds direct one-hop neighbours', () => {
    const { model } = loadModel();
    expectValidModel(model);
    const result = neighbors(model, 'support_tickets');
    expect(result.tables.has('support_tickets')).toBe(true);
    expect(result.tables.has('organizations')).toBe(true);
    expect(result.tables.has('ticket_messages')).toBe(true);
    expect(result.tables.has('knowledge_articles')).toBe(false);
  });

  it('finds a two-hop shortest path', () => {
    const { model } = loadModel();
    const result = findPath(model, 'ticket_messages', 'contacts');
    expect(result.found).toBe(true);
    expect(result.tables).toEqual(['ticket_messages', 'support_tickets', 'contacts']);
  });

  it('finds multi-hop paths', () => {
    const { model } = loadModel();
    const result = findPath(model, 'suggestion_sources', 'organizations');
    expect(result.found).toBe(true);
    expect(result.tables[0]).toBe('suggestion_sources');
    expect(result.tables.at(-1)).toBe('organizations');
  });

  it('rejects same-table paths', () => {
    const { model } = loadModel();
    const result = findPath(model, 'organizations', 'organizations');
    expect(result.found).toBe(false);
    expect(result.reason).toBe('same-table');
  });

  it('rejects unknown tables', () => {
    const { model } = loadModel();
    expect(findPath(model, 'organizations', 'does_not_exist').reason).toBe('unknown-table');
  });
});
