import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type TableNodeData = {
  table: { name: string; note?: string; domain?: string; headerColor?: string; noteHeight?: number; fields: { name: string; isPk: boolean; isFk: boolean; notNull: boolean; type?: string }[] };
  view: 'tables-only' | 'keys' | 'all-fields';
  selected: boolean;
  faded: boolean;
};

function TableNode({ data, selected }: NodeProps<Node<TableNodeData>>) {
  const { table, view, faded } = data;
  const fields =
    view === 'tables-only' ? [] : view === 'keys' ? table.fields.filter((f) => f.isPk || f.isFk) : table.fields;
  return (
    <div className={`tf-node${selected || data.selected ? ' selected' : ''}${faded ? ' faded' : ''}`} role="group" aria-label={`Table ${table.name}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <header className="tf-header">
        <span className="tf-title" title={table.name}>{table.name}</span>
        {table.domain && <span className="tf-domain" title={table.domain}>{table.domain}</span>}
      </header>
      {table.note && view === 'all-fields' && (
        <p className="tf-note" style={{ height: table.noteHeight }} title={`One row represents: ${table.note}`}>One row represents: {table.note}</p>
      )}
      <ul className="tf-fields">
        {fields.map((f) => (
          <li key={f.name} className={`tf-field${f.isPk ? ' pk' : ''}${f.isFk ? ' fk' : ''}`}>
            <span className="tf-field-name" title={f.name}>{f.name}</span>
            <span className="tf-markers">
              {f.isPk && <small className="tf-key-badge tf-key-pk" title="Primary key">PK</small>}
              {f.isFk && <small className="tf-key-badge tf-key-fk" title="Foreign key">FK</small>}
              {view === 'all-fields' && <small className="tf-type">{f.type}</small>}
              {f.notNull && <span className="tf-required" title="Required (not nullable)" aria-label="Required">*</span>}
            </span>
          </li>
        ))}
      </ul>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const nodeTypes = { tableNode: memo(TableNode) };
