import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

describe('public build exclusion', () => {
  const distPublic = join(root, 'dist-public', 'assets');

  it('dist-public exists (run npm run build:public first)', () => {
    expect(existsSync(distPublic)).toBe(true);
  });

  it('contains no annotation write/read paths, file references or governance UI', () => {
    const files = readdirSync(distPublic).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    const content = files.map((f) => readFileSync(join(distPublic, f), 'utf8')).join('\n');
    const forbidden = ['/api/annotations', 'annotations.json', 'Save annotations', 'Add review note', 'Annotations]'];
    for (const token of forbidden) {
      expect(content.includes(token), `public bundle should not contain "${token}"`).toBe(false);
    }
  });

  it('embeds no absolute machine paths', () => {
    const files = readdirSync(join(root, 'dist-public', 'assets')).filter((f) => f.endsWith('.js'));
    const content = files.map((f) => readFileSync(join(root, 'dist-public', 'assets', f), 'utf8')).join('\n');
    // No Windows drive letters or unix home roots baked in.
    expect(/[A-Za-z]:\\Personal\\/.test(content)).toBe(false);
    expect(/\/home\/[^/]+\//.test(content)).toBe(false);
  });
});
