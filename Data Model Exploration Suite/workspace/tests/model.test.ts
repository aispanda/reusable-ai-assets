import { describe, it, expect } from 'vitest';
import { buildModel, validateModel } from '../src/lib/model';
import { loadCanonicalDbml, loadModel, expectValidModel } from './fixtures';

describe('model transform + validation', () => {
  it('produces a valid model derived from the fictional DBML', () => {
    const { model } = loadModel();
    expectValidModel(model);
    expect(model.tables.length).toBe(9);
    expect(model.relationships.length).toBe(10);
    expect(model.domainOrder).toEqual(['Customer and service', 'Knowledge and AI', 'Governance']);
  });

  it('marks PK/FK flags and optionality', () => {
    const { model } = loadModel();
    const tickets = model.tableByName.get('support_tickets')!;
    const id = tickets.fields.find((field) => field.name === 'id')!;
    const organization = tickets.fields.find((field) => field.name === 'organization_id')!;
    const assigned = tickets.fields.find((field) => field.name === 'assigned_agent_id')!;
    expect(id.isPk && id.notNull).toBe(true);
    expect(organization.isFk && organization.notNull).toBe(true);
    expect(assigned.isFk).toBe(true);
    expect(assigned.notNull).toBe(false);
  });

  it('classifies composite relationships using a neutral fixture', () => {
    const model = buildModel(`
      Table parents {
        tenant_id uuid [not null, note: 'Scope identifier.']
        id uuid [not null, note: 'Record identifier.']
        Note: 'One fictional parent record.'
        indexes { (tenant_id, id) [pk] }
      }
      Table children {
        id uuid [pk, not null, note: 'Record identifier.']
        tenant_id uuid [not null, note: 'Scope identifier.']
        parent_id uuid [not null, note: 'Parent identifier.']
        Note: 'One fictional child record.'
      }
      Ref: children.(tenant_id, parent_id) > parents.(tenant_id, id)
    `);
    expect(model.relationships).toHaveLength(1);
    expect(model.relationships[0].composite).toBe(true);
  });

  it('detects nullable foreign keys', () => {
    const { model } = loadModel();
    const optional = model.relationships.find((item) => item.from.table === 'support_tickets' && item.to.table === 'service_agents')!;
    const required = model.relationships.find((item) => item.from.table === 'contacts' && item.to.table === 'organizations')!;
    expect(optional.nullable).toBe(true);
    expect(required.nullable).toBe(false);
  });

  it('fails validation when a table loses its note', () => {
    const source = loadCanonicalDbml().replace(/\n\s*Note: 'One row represents an authoritative fictional customer-support request[^']*'/, '');
    const issues = validateModel(buildModel(source));
    expect(issues.some((issue) => issue.code === 'table-missing-note' && issue.context?.table === 'support_tickets')).toBe(true);
  });

  it('rejects missing fields and duplicate relationships', () => {
    const missing = loadCanonicalDbml().replace('Ref: ticket_messages.ticket_id > support_tickets.id', 'Ref: ticket_messages.missing_id > support_tickets.id');
    expect(() => buildModel(missing)).toThrow(/does not exist|parse error/i);
    const source = loadCanonicalDbml();
    const duplicate = source.replace('Ref: audit_events.agent_id > service_agents.id', 'Ref: audit_events.agent_id > service_agents.id\nRef: audit_events.agent_id > service_agents.id');
    expect(() => buildModel(duplicate)).toThrow(/same endpoints|duplicate/i);
  });
});
