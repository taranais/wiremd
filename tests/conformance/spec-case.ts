import { it } from 'vitest';

export function specCase(featureId: string, title: string, fn: () => void | Promise<void>) {
  return it(`[${featureId}] ${title}`, fn);
}
