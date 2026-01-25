import { describe, it, expect } from 'vitest';
import {
  ALL_FRAMEWORKS,
  getFramework,
  getFrameworks,
  FRAMEWORK_VERSIONS,
  OFFER_ECONOMICS_FRAMEWORK,
  MARKET_AWARENESS_FRAMEWORK,
  PERSUASION_FRAMEWORK,
  FUNNEL_DESIGN_FRAMEWORK,
} from './frameworks/index.js';

describe('Week 3 Frameworks', () => {
  describe('ALL_FRAMEWORKS', () => {
    it('contains all 4 required frameworks', () => {
      expect(Object.keys(ALL_FRAMEWORKS)).toHaveLength(4);
      expect(ALL_FRAMEWORKS['offer-economics']).toBeDefined();
      expect(ALL_FRAMEWORKS['market-awareness']).toBeDefined();
      expect(ALL_FRAMEWORKS['persuasion']).toBeDefined();
      expect(ALL_FRAMEWORKS['funnel-design']).toBeDefined();
    });
  });

  describe('getFramework', () => {
    it('returns framework by ID', () => {
      const framework = getFramework('offer-economics');
      expect(framework).toBe(OFFER_ECONOMICS_FRAMEWORK);
    });

    it('returns undefined for unknown framework', () => {
      const framework = getFramework('unknown');
      expect(framework).toBeUndefined();
    });
  });

  describe('getFrameworks', () => {
    it('returns multiple frameworks by IDs', () => {
      const frameworks = getFrameworks(['offer-economics', 'persuasion']);
      expect(frameworks).toHaveLength(2);
    });

    it('filters out unknown frameworks', () => {
      const frameworks = getFrameworks(['offer-economics', 'unknown']);
      expect(frameworks).toHaveLength(1);
    });
  });

  describe('FRAMEWORK_VERSIONS', () => {
    it('all frameworks have versions', () => {
      for (const id of Object.keys(ALL_FRAMEWORKS)) {
        expect(FRAMEWORK_VERSIONS[id]).toBeDefined();
        expect(FRAMEWORK_VERSIONS[id]).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });
  });

  describe('Offer Economics Framework', () => {
    it('has correct structure', () => {
      expect(OFFER_ECONOMICS_FRAMEWORK.name).toBe('Offer Economics');
      expect(OFFER_ECONOMICS_FRAMEWORK.content).toContain('Value Equation');
      expect(OFFER_ECONOMICS_FRAMEWORK.content).toContain('Dream Outcome');
      expect(OFFER_ECONOMICS_FRAMEWORK.content).toContain('Hormozi');
      expect(OFFER_ECONOMICS_FRAMEWORK.priority).toBeLessThan(100);
    });

    it('covers all value equation components', () => {
      const content = OFFER_ECONOMICS_FRAMEWORK.content;
      expect(content).toContain('Dream Outcome');
      expect(content).toContain('Perceived Likelihood');
      expect(content).toContain('Time Delay');
      expect(content).toContain('Effort');
    });
  });

  describe('Market Awareness Framework', () => {
    it('has correct structure', () => {
      expect(MARKET_AWARENESS_FRAMEWORK.name).toBe('Market Awareness');
      expect(MARKET_AWARENESS_FRAMEWORK.content).toContain('Awareness');
      expect(MARKET_AWARENESS_FRAMEWORK.content).toContain('Schwartz');
    });

    it('covers all 5 awareness levels', () => {
      const content = MARKET_AWARENESS_FRAMEWORK.content;
      expect(content).toContain('UNAWARE');
      expect(content).toContain('PROBLEM AWARE');
      expect(content).toContain('SOLUTION AWARE');
      expect(content).toContain('PRODUCT AWARE');
      expect(content).toContain('MOST AWARE');
    });
  });

  describe('Persuasion Framework', () => {
    it('has correct structure', () => {
      expect(PERSUASION_FRAMEWORK.name).toBe('Persuasion');
      expect(PERSUASION_FRAMEWORK.content).toContain('PAS');
      expect(PERSUASION_FRAMEWORK.content).toContain('AIDA');
    });

    it('includes proof hierarchy', () => {
      const content = PERSUASION_FRAMEWORK.content;
      expect(content).toContain('Proof Hierarchy');
      expect(content).toContain('Demonstration');
      expect(content).toContain('Testimonials');
    });

    it('covers PAS framework', () => {
      const content = PERSUASION_FRAMEWORK.content;
      expect(content).toContain('Problem');
      expect(content).toContain('Agitate');
      expect(content).toContain('Solve');
    });

    it('covers AIDA framework', () => {
      const content = PERSUASION_FRAMEWORK.content;
      expect(content).toContain('Attention');
      expect(content).toContain('Interest');
      expect(content).toContain('Desire');
      expect(content).toContain('Action');
    });
  });

  describe('Funnel Design Framework', () => {
    it('has correct structure', () => {
      expect(FUNNEL_DESIGN_FRAMEWORK.name).toBe('Funnel Design');
      expect(FUNNEL_DESIGN_FRAMEWORK.content).toContain('Funnel');
      expect(FUNNEL_DESIGN_FRAMEWORK.content).toContain('CTA');
    });

    it('covers funnel stages', () => {
      const content = FUNNEL_DESIGN_FRAMEWORK.content;
      expect(content).toContain('TOFU');
      expect(content).toContain('MOFU');
      expect(content).toContain('BOFU');
    });

    it('includes CTA rules', () => {
      const content = FUNNEL_DESIGN_FRAMEWORK.content;
      expect(content).toContain('Button');
      expect(content).toContain('CTA');
    });
  });

  describe('Framework conciseness', () => {
    it('all frameworks are under 5000 characters', () => {
      for (const [_id, framework] of Object.entries(ALL_FRAMEWORKS)) {
        expect(framework.content.length).toBeLessThan(5000);
      }
    });
  });
});
