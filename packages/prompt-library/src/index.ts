// Types
export type { FrameworkBlock } from './types.js';

// Global Rules
export {
  GLOBAL_RULES,
  CLIENT_FACING_RULES,
  CODE_GENERATION_RULES,
  DATA_PROCESSING_RULES,
  getRulesByCategory,
} from './global-rules.js';

// Legacy Frameworks (placeholders)
export {
  MARKETING_FRAMEWORK,
  TECHNICAL_DOCS_FRAMEWORK,
  ECOMMERCE_FRAMEWORK,
  CLIENT_COMMUNICATION_FRAMEWORK,
  getDefaultFrameworks,
  getFrameworkByName,
} from './frameworks.js';

// Week 3 Frameworks (Hormozi + Psychology)
export {
  OFFER_ECONOMICS_FRAMEWORK,
  OFFER_ECONOMICS_VERSION,
  MARKET_AWARENESS_FRAMEWORK,
  MARKET_AWARENESS_VERSION,
  PERSUASION_FRAMEWORK,
  PERSUASION_VERSION,
  FUNNEL_DESIGN_FRAMEWORK,
  FUNNEL_DESIGN_VERSION,
  ALL_FRAMEWORKS,
  getFramework,
  getFrameworks,
  FRAMEWORK_VERSIONS,
} from './frameworks/index.js';
