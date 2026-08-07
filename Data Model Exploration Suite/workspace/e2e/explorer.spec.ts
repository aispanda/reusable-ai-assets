import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? '5174'}/`;

test.describe('Data Model Workspace', () => {
  test('renders the fictional model and supports path exploration', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error.message)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveText('Data Model Workspace');
    await expect(page.locator('.react-flow__node')).toHaveCount(9);
    await expect(page.locator('.react-flow__edge')).toHaveCount(10);
    await expect(page.locator('.multiplicity-marker')).toHaveCount(20);
    await expect(page.locator('.tf-key-badge').filter({ hasText: 'PK' })).not.toHaveCount(0);
    await expect(page.locator('.tf-key-badge').filter({ hasText: 'FK' })).not.toHaveCount(0);

    await page.locator('.react-flow__node', { hasText: 'support_tickets' }).first().click();
    await expect(page.locator('.details')).toContainText('authoritative fictional customer-support request');
    await page.locator('.react-flow__node', { hasText: 'contacts' }).first().click();
    await expect(page.locator('.details')).toContainText('Shortest path (1 hop)');

    const benign = (error: string) => error.includes('ResizeObserver') || error.toLowerCase().includes('source map');
    expect(errors.filter((error) => !benign(error))).toEqual([]);
  });

  test('explains selected relationship cardinality', async ({ page }) => {
    const relationship = encodeURIComponent('rel:contacts.organization_id→organizations.id');
    await page.goto(`${BASE}#dm=${encodeURIComponent(`view=keys&select=${relationship}`)}`, { waitUntil: 'networkidle' });
    await expect(page.locator('.routed-edge-label')).toHaveCount(1);
    await expect(page.locator('.details')).toContainText('contacts(organization_id)');
    await expect(page.locator('.cardinality-card')).toContainText('organizations');
    await expect(page.locator('.notation-legend')).toContainText('Exactly one');
  });

  test('restores views, domain filters and deep links', async ({ page }) => {
    await page.goto(`${BASE}#dm=view%3Dkeys%26select%3Dtable%253Aai_suggestions`, { waitUntil: 'networkidle' });
    await expect(page.locator('.details')).toContainText('AI recommendation');
    await page.locator('select[aria-label="View mode"]').selectOption('all-fields');
    await expect(page.locator('.react-flow__node').filter({ hasText: 'uuid' })).not.toHaveCount(0);
    await page.locator('select[aria-label="Filter by domain"]').selectOption('Knowledge and AI');
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
  });

  test('keeps node meaning and fields visible', async ({ page }) => {
    await page.goto(`${BASE}#dm=view%3Dall-fields%26select%3Dtable%253Aticket_messages%26domain%3DCustomer%2Band%2Bservice`, { waitUntil: 'networkidle' });
    const node = page.locator('.react-flow__node[data-id="ticket_messages"] .tf-node');
    await expect(node.locator('.tf-field')).toHaveCount(6);
    await expect(node.locator('.tf-field:last-child')).toContainText('occurred_at');
    const fits = await node.evaluate((element) => {
      const last = element.querySelector('.tf-field:last-child')!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return last.bottom <= box.bottom + 1;
    });
    expect(fits).toBeTruthy();
    await expect(page.locator('.field-table thead')).toContainText('Meaning / populated by');
    await expect(page.locator('.field-table tbody tr').filter({ hasText: 'sender_address' })).toContainText('Optional');
  });

  test('keeps comparison endpoints and path readable', async ({ page }) => {
    await page.goto(`${BASE}#dm=view%3Dkeys%26select%3Dtable%253Aknowledge_articles%26compare%3Daudit_events`, { waitUntil: 'networkidle' });
    await expect(page.locator('.react-flow__node[data-id="knowledge_articles"] .tf-node')).not.toHaveClass(/faded/);
    await expect(page.locator('.react-flow__node[data-id="audit_events"] .tf-node')).not.toHaveClass(/faded/);
  });

  test('keyboard focus and form labels remain accessible', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab');
      const className = await page.evaluate(() => document.activeElement?.className ?? '');
      if (String(className).includes('react-flow__node')) break;
    }
    const outline = await page.evaluate(() => window.getComputedStyle(document.activeElement as HTMLElement).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThan(0);
    const labelled = await page.evaluate(() => Array.from(document.querySelectorAll('select, input, textarea')).every((control) => {
      const id = control.getAttribute('id');
      return Boolean(control.getAttribute('aria-label') || (id && document.querySelector(`label[for="${id}"]`)));
    }));
    expect(labelled).toBeTruthy();
  });

  test('has no serious app-owned accessibility violations', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    const filtered = serious.filter((violation) => {
      if (violation.id === 'region') return false;
      return !(violation.id === 'color-contrast' && violation.nodes.every((node) => node.html.includes('react-flow__attribution')));
    });
    expect(filtered).toEqual([]);
  });
});
