import { resolveSelector, decodeSelector } from './selectors';
import type { DataModel } from './model';
import { parseAnnotations, serializeAnnotations, validateAnnotations, type AnnotationFile } from './annotations';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Resolve selector target text against the model. */
export function makeResolve(model: DataModel): (target: string) => boolean {
  return (target: string) => {
    const sel = decodeSelector(target);
    if (!sel) return false;
    return resolveSelector(model, sel) !== null;
  };
}

/** Load an annotation sidecar, returning an empty file when missing. */
export async function loadAnnotations(model: DataModel, path: string): Promise<{ file: AnnotationFile; report: ReturnType<typeof validateAnnotations> }> {
  let raw: string | null = null;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    // Missing file is fine — start fresh.
  }
  const file: AnnotationFile = raw ? parseAnnotations(raw) : { version: 1, project: 'data-model-review', annotations: [] };
  const report = validateAnnotations(model, file, makeResolve(model));
  return { file, report };
}

/** Atomically-ish write the sidecar with subfolder creation. */
export async function saveAnnotations(path: string, file: AnnotationFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serializeAnnotations(file), 'utf8');
}
