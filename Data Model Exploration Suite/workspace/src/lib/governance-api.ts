// Governance (local-only) persistence. In public builds, Vite statically
// replaces `__PUBLIC_MODE__` with `true`, so the public branches are
// compile-time constants and the local API code is dead-code-eliminated.
export interface AnnotationDoc {
  target: string;
  text: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceFile {
  version: number;
  project: string;
  annotations: AnnotationDoc[];
}

export interface GovernanceStore {
  load(): Promise<GovernanceFile | null>;
  save(file: GovernanceFile): Promise<boolean>;
}

declare const __PUBLIC_MODE__: boolean;

const PUBLIC = typeof __PUBLIC_MODE__ !== 'undefined' && __PUBLIC_MODE__ === true;

export const governanceStore: GovernanceStore = {
  async load() {
    if (PUBLIC) return null;
    const res = await fetch('/api/annotations');
    if (!res.ok) return null;
    return (await res.json()) as GovernanceFile;
  },
  async save(file) {
    if (PUBLIC) return false;
    const res = await fetch('/api/annotations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(file) });
    return res.ok;
  },
};
