import { encodeSelector, type Selector } from './selectors';
import type { DataModel } from './model';

export type AnnotationStatus = 'open' | 'resolved' | 'wontfix';

export interface Annotation {
  /** Stable selector text (see encodeSelector). */
  target: string;
  text: string;
  status: AnnotationStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface AnnotationFile {
  version: 1;
  project: string;
  annotations: Annotation[];
}

export const ANNOTATION_FILE_VERSION = 1;

export function emptyAnnotationFile(project = 'data-model-review'): AnnotationFile {
  return { version: ANNOTATION_FILE_VERSION, project, annotations: [] };
}

/** Create a new annotation for a selector. */
export function makeAnnotation(sel: Selector, text: string, now = new Date()): Annotation {
  const iso = now.toISOString();
  return { target: encodeSelector(sel), text, status: 'open', createdAt: iso, updatedAt: iso };
}

export interface ValidationReport {
  orphans: Array<{ annotation: Annotation; reason: 'table-missing' | 'field-missing' | 'relationship-missing' }>;
  valid: Annotation[];
}

/**
 * Detect annotations whose target no longer resolves after regeneration.
 * Callers surface orphans to the user instead of silently dropping them.
 */
export function validateAnnotations(model: DataModel, file: AnnotationFile, resolve: (target: string) => boolean): ValidationReport {
  const orphans: ValidationReport['orphans'] = [];
  const valid: Annotation[] = [];
  for (const a of file.annotations) {
    if (resolve(a.target)) valid.push(a);
    else orphans.push({ annotation: a, reason: inferOrphanReason(model, a.target) });
  }
  return { orphans, valid };
}

function inferOrphanReason(model: DataModel, target: string): 'table-missing' | 'field-missing' | 'relationship-missing' {
  if (target.startsWith('table:')) return 'table-missing';
  if (target.startsWith('field:')) {
    const table = target.slice('field:'.length).split('.')[0];
    return model.tableByName.has(table) ? 'field-missing' : 'table-missing';
  }
  return 'relationship-missing';
}

/** Serialize for the versioned sidecar. */
export function serializeAnnotations(file: AnnotationFile): string {
  return JSON.stringify(file, null, 2) + '\n';
}

/** Parse sidecar; throws with a readable error on corruption. */
export function parseAnnotations(raw: string): AnnotationFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Annotation file is not valid JSON. Fix or delete it before continuing.');
  }
  const file = data as Partial<AnnotationFile>;
  if (file.version !== ANNOTATION_FILE_VERSION) {
    throw new Error(`Annotation file version must be ${ANNOTATION_FILE_VERSION}. Please start a fresh file.`);
  }
  if (!Array.isArray(file.annotations)) {
    throw new Error('Annotation file is missing the annotations array.');
  }
  for (const a of file.annotations) {
    if (typeof a.target !== 'string' || typeof a.text !== 'string' || !a.status || !a.updatedAt) {
      throw new Error('Annotation entries must include target, text, status and updatedAt.');
    }
  }
  return file as AnnotationFile;
}
