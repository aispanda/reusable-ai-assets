import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLayoutSpec, buildEdgeSpecs } from '../src/lib/layout-spec';
import { loadModel, expectValidModel } from './fixtures';

const here = dirname(fileURLToPath(import.meta.url));
const generated = join(here, '..', 'generated');

describe('per-view layout specs and positions', () => {
  it('keys layout has a position for every table', () => {
    const layout = JSON.parse(readFileSync(join(generated, 'positions-keys.json'), 'utf8'));
    expect(layout.mode).toBe('keys');
    expect(layout.tables.length).toBe(9);
    for (const table of layout.tables) {
      expect(typeof table.x).toBe('number');
      expect(typeof table.y).toBe('number');
    }
  });

  it('all view modes reference the same tables', () => {
    const names = (model: { tables: { name: string }[] }) => model.tables.map((table) => table.name).sort();
    const tablesOnly = JSON.parse(readFileSync(join(generated, 'positions-tables-only.json'), 'utf8'));
    const keys = JSON.parse(readFileSync(join(generated, 'positions-keys.json'), 'utf8'));
    const all = JSON.parse(readFileSync(join(generated, 'positions-all-fields.json'), 'utf8'));
    expect(names(tablesOnly)).toEqual(names(keys));
    expect(names(keys)).toEqual(names(all));
  });

  it('specs are deterministic', () => {
    const { model } = loadModel();
    expectValidModel(model);
    expect(JSON.stringify(buildLayoutSpec(model, 'keys'))).toBe(JSON.stringify(buildLayoutSpec(model, 'keys')));
  });

  it('edges carry stable relationship labels', () => {
    const { model } = loadModel();
    const edge = buildEdgeSpecs(model).find((item) => item.from.table === 'contacts' && item.to.table === 'organizations')!;
    expect(edge.label).toContain('organization_id');
    expect(edge.label).toContain('id');
    expect(edge.composite).toBe(false);
  });

  it('different views yield different sizes', () => {
    const { model } = loadModel();
    const keys = buildLayoutSpec(model, 'keys').tables.find((table) => table.name === 'ai_suggestions')!;
    const all = buildLayoutSpec(model, 'all-fields').tables.find((table) => table.name === 'ai_suggestions')!;
    expect(all.height).toBeGreaterThan(keys.height);
  });
});
