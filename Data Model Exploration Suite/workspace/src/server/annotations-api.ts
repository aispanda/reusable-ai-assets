import type { Connect, Plugin } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(here, '..', '..');
const ANNOTATION_PATH = join(workspaceRoot, 'review', 'annotations.json');

async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export function annotationsApi(): Plugin {
  return {
    name: 'annotations-local-api',
    configureServer(server) {
      server.middlewares.use('/api/annotations', async (req, res) => {
        if (req.method === 'GET') {
          try {
            const raw = await readFile(ANNOTATION_PATH, 'utf8');
            res.setHeader('content-type', 'application/json');
            res.end(raw);
          } catch {
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ version: 1, project: 'data-model-review', annotations: [] }));
          }
          return;
        }
        if (req.method === 'POST') {
          const body = (await readJsonBody(req)) as { annotations?: unknown; project?: string; version?: number };
          // Shape validation happens client-side; we persist what the app sends.
          await mkdir(dirname(ANNOTATION_PATH), { recursive: true });
          await writeFile(ANNOTATION_PATH, JSON.stringify(body, null, 2) + '\n', 'utf8');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'method not allowed' }));
      });
    },
  };
}

export const ANNOTATION_FILE = ANNOTATION_PATH;
