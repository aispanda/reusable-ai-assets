import type { DataModel, RelationshipModel } from './model';

/** Undirected adjacency: table name → list of { neighbor, relationship }. */
export type Adjacency = Map<string, Array<{ table: string; relationship: RelationshipModel }>>;

export function buildAdjacency(model: DataModel): Adjacency {
  const adj: Adjacency = new Map();
  const add = (from: string, to: string, rel: RelationshipModel) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push({ table: to, relationship: rel });
  };
  for (const rel of model.relationships) {
    add(rel.from.table, rel.to.table, rel);
    add(rel.to.table, rel.from.table, rel);
  }
  return adj;
}

/** Direct neighbours for the "one-table neighbourhood" highlight. */
export function neighbors(model: DataModel, tableName: string): { tables: Set<string>; relationships: Set<string> } {
  const tables = new Set<string>([tableName]);
  const relationships = new Set<string>();
  for (const rel of model.relationships) {
    if (rel.from.table === tableName || rel.to.table === tableName) {
      relationships.add(rel.id);
      tables.add(rel.from.table);
      tables.add(rel.to.table);
    }
  }
  return { tables, relationships };
}

export interface PathResult {
  found: boolean;
  /** Ordered tables along the path, including both endpoints when found. */
  tables: string[];
  /** Relationship ids along the path. */
  relationships: string[];
  /** Reason when not found. */
  reason?: 'same-table' | 'unknown-table' | 'no-path';
}

/**
 * Breadth-first shortest path across the UNDIRECTED relationship graph.
 *
 * Returns actual relationships so UI can still render true FK direction and
 * cardinality; the search itself is undirected per the amendment.
 */
export function findPath(model: DataModel, fromTable: string, toTable: string): PathResult {
  if (fromTable === toTable) {
    return { found: false, tables: [], relationships: [], reason: 'same-table' };
  }
  if (!model.tableByName.has(fromTable) || !model.tableByName.has(toTable)) {
    return { found: false, tables: [], relationships: [], reason: 'unknown-table' };
  }

  const adj = buildAdjacency(model);
  const visited = new Set<string>([fromTable]);
  // prev[table] = { via: previousTable, relationship: relId }
  const prev = new Map<string, { via: string; relationship: string }>();
  const queue: string[] = [fromTable];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toTable) break;
    for (const edge of adj.get(current) ?? []) {
      if (visited.has(edge.table)) continue;
      visited.add(edge.table);
      prev.set(edge.table, { via: current, relationship: edge.relationship.id });
      queue.push(edge.table);
    }
  }

  if (!prev.has(toTable) && fromTable !== toTable) {
    return { found: false, tables: [], relationships: [], reason: 'no-path' };
  }

  // Reconstruct.
  const tables: string[] = [];
  const relationships: string[] = [];
  let cursor = toTable;
  tables.unshift(cursor);
  while (cursor !== fromTable) {
    const step = prev.get(cursor);
    if (!step) break;
    relationships.unshift(step.relationship);
    cursor = step.via;
    tables.unshift(cursor);
  }

  return { found: true, tables, relationships };
}
