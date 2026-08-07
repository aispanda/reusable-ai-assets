import { encodeSelector, decodeSelector, type Selector } from './selectors';
import { DEFAULT_VIEW, VIEW_MODES, type ViewMode } from './views';

export interface UrlState {
  view: ViewMode;
  /** Selected selector (table/field/relationship) encoded. */
  select?: string;
  /** Secondary table for two-table path selection. */
  compare?: string;
  /** Search query. */
  q?: string;
  /** Domain filter. */
  domain?: string;
}

export const URL_PARAM = 'dm';

/** Build a shareable URL state from parts. */
export function buildUrlState(partial: Partial<UrlState>): string {
  const params = new URLSearchParams();
  const view = partial.view && VIEW_MODES.includes(partial.view) ? partial.view : DEFAULT_VIEW;
  params.set('view', view);
  if (partial.select) params.set('select', partial.select);
  if (partial.compare) params.set('compare', partial.compare);
  if (partial.q) params.set('q', partial.q);
  if (partial.domain) params.set('domain', partial.domain);
  return `#${URL_PARAM}=${encodeURIComponent(params.toString())}`;
}

/** Parse a window.location.hash into state. */
export function parseUrlState(hash: string): UrlState {
  const state: UrlState = { view: DEFAULT_VIEW };
  const cleaned = hash.replace(/^#/, '');
  const outer = new URLSearchParams(cleaned);
  const inner = outer.get(URL_PARAM);
  if (!inner) return state;
  const params = new URLSearchParams(decodeURIComponent(inner));
  const view = params.get('view');
  if (view && VIEW_MODES.includes(view as ViewMode)) state.view = view as ViewMode;
  const select = params.get('select');
  if (select) state.select = select;
  const compare = params.get('compare');
  if (compare) state.compare = compare;
  const q = params.get('q');
  if (q) state.q = q;
  const domain = params.get('domain');
  if (domain) state.domain = domain;
  return state;
}

export function selectorFromState(encoded?: string): Selector | null {
  if (!encoded) return null;
  return decodeSelector(encoded);
}

export function selectorToState(sel: Selector): string {
  return encodeSelector(sel);
}
