/**
 * Framework blocks for agent prompt compilation
 * All frameworks are versioned and cacheable
 */

export {
  OFFER_ECONOMICS_FRAMEWORK,
  OFFER_ECONOMICS_VERSION,
} from './offer-economics.js';

export {
  MARKET_AWARENESS_FRAMEWORK,
  MARKET_AWARENESS_VERSION,
} from './market-awareness.js';

export {
  PERSUASION_FRAMEWORK,
  PERSUASION_VERSION,
} from './persuasion.js';

export {
  FUNNEL_DESIGN_FRAMEWORK,
  FUNNEL_DESIGN_VERSION,
} from './funnel-design.js';

import type { FrameworkBlock } from '../types.js';
import { OFFER_ECONOMICS_FRAMEWORK } from './offer-economics.js';
import { MARKET_AWARENESS_FRAMEWORK } from './market-awareness.js';
import { PERSUASION_FRAMEWORK } from './persuasion.js';
import { FUNNEL_DESIGN_FRAMEWORK } from './funnel-design.js';

/**
 * All available framework blocks
 */
export const ALL_FRAMEWORKS: Record<string, FrameworkBlock> = {
  'offer-economics': OFFER_ECONOMICS_FRAMEWORK,
  'market-awareness': MARKET_AWARENESS_FRAMEWORK,
  'persuasion': PERSUASION_FRAMEWORK,
  'funnel-design': FUNNEL_DESIGN_FRAMEWORK,
};

/**
 * Get framework by ID
 */
export function getFramework(id: string): FrameworkBlock | undefined {
  return ALL_FRAMEWORKS[id];
}

/**
 * Get multiple frameworks by IDs
 */
export function getFrameworks(ids: string[]): FrameworkBlock[] {
  return ids
    .map((id) => ALL_FRAMEWORKS[id])
    .filter((f): f is FrameworkBlock => f !== undefined);
}

/**
 * Framework versions for cache invalidation
 */
export const FRAMEWORK_VERSIONS: Record<string, string> = {
  'offer-economics': '1.0.0',
  'market-awareness': '1.0.0',
  'persuasion': '1.0.0',
  'funnel-design': '1.0.0',
};
