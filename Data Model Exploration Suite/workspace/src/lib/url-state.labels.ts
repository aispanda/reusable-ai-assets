import { selectorLabel, type Selector } from './selectors';

export function selectorFromStateLabel(sel: Selector | null): string | null {
  return sel ? selectorLabel(sel) : null;
}

export { selectorLabel };
