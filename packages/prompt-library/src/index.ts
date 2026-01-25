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

// Frameworks
export {
  MARKETING_FRAMEWORK,
  TECHNICAL_DOCS_FRAMEWORK,
  ECOMMERCE_FRAMEWORK,
  CLIENT_COMMUNICATION_FRAMEWORK,
  getDefaultFrameworks,
  getFrameworkByName,
} from './frameworks.js';
