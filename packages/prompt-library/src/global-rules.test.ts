import { describe, it, expect } from 'vitest';
import { GLOBAL_RULES, getRulesByCategory } from './global-rules.js';

describe('GLOBAL_RULES', () => {
  it('contains essential rules', () => {
    expect(GLOBAL_RULES.length).toBeGreaterThan(5);
    expect(GLOBAL_RULES.some((r) => r.includes('assumption'))).toBe(true);
    expect(GLOBAL_RULES.some((r) => r.includes('JSON'))).toBe(true);
  });
});

describe('getRulesByCategory', () => {
  it('returns global rules for global category', () => {
    const rules = getRulesByCategory('global');
    expect(rules).toEqual(GLOBAL_RULES);
  });

  it('returns combined rules for client-facing category', () => {
    const rules = getRulesByCategory('client-facing');
    expect(rules.length).toBeGreaterThan(GLOBAL_RULES.length);
    expect(rules.some((r) => r.includes('professional'))).toBe(true);
  });

  it('returns combined rules for code-generation category', () => {
    const rules = getRulesByCategory('code-generation');
    expect(rules.length).toBeGreaterThan(GLOBAL_RULES.length);
    expect(rules.some((r) => r.includes('code style'))).toBe(true);
  });
});
