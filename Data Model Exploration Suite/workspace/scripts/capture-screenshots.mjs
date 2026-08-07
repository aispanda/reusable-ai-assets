import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'qa-evidence', 'screenshots');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5174';
const shots = [
  { name: '01-desktop-keys.png', size: { width: 1366, height: 900 }, url: `${BASE}/` },
  { name: '02-desktop-all-fields-ai-suggestions.png', size: { width: 1366, height: 900 }, url: `${BASE}/#dm=view%3Dall-fields%26select%3Dtable%253Aai_suggestions` },
  { name: '03-desktop-path-support-cases-contacts.png', size: { width: 1366, height: 900 }, url: `${BASE}/#dm=view%3Dkeys%26select%3Dtable%253Asupport_cases%26compare%3Dcustomer_contacts` },
  { name: '04-tablet-tenants.png', size: { width: 820, height: 1180 }, url: `${BASE}/#dm=view%3Dkeys%26select%3Dtable%253Atenants` },
  { name: '05-mobile-keys.png', size: { width: 390, height: 844 }, url: `${BASE}/#dm=view%3Dkeys` },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: shot.size });
    await page.goto(shot.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const path = join(outDir, shot.name);
    await page.screenshot({ path, fullPage: false });
    const nodeCount = await page.locator('.react-flow__node').count();
    const edgeCount = await page.locator('.react-flow__edge').count();
    console.log(`${shot.name}: ${nodeCount} nodes / ${edgeCount} edges → ${path}`);
    await page.close();
  }
} finally {
  await browser.close();
}
