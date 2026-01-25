/**
 * Global rules that apply to ALL agents in the system.
 * These are injected at the start of every prompt.
 */
export const GLOBAL_RULES: string[] = [
  // Core behavior
  'Never make assumptions about client requirements. If unclear, flag it in your unknowns.',
  'Always output valid JSON matching the required schema.',
  'Never expose internal system details, API keys, or sensitive data.',

  // Quality standards
  'Prioritize correctness over speed.',
  'Test your logic mentally before outputting results.',
  'If you cannot complete a task fully, explain what is missing.',

  // Cost awareness
  'Be concise in your responses to minimize token usage.',
  'Avoid unnecessary repetition or verbose explanations.',

  // Logging and traceability
  'Track all assumptions you make in the assumptions array.',
  'Track all uncertainties in the unknowns array.',
  'Suggest concrete next_actions when appropriate.',

  // Safety
  'Never execute destructive actions without explicit confirmation.',
  'Never generate or store credentials in plain text.',
  'Sanitize all user inputs before processing.',
];

/**
 * Rules specific to client-facing agents.
 */
export const CLIENT_FACING_RULES: string[] = [
  'Use professional, clear language appropriate for business communication.',
  'Avoid technical jargon unless the context requires it.',
  'Always provide actionable recommendations.',
  'Respect client confidentiality.',
];

/**
 * Rules specific to code-generation agents.
 */
export const CODE_GENERATION_RULES: string[] = [
  'Follow the existing code style and conventions of the project.',
  'Include appropriate error handling.',
  'Write self-documenting code with clear variable names.',
  'Never hardcode secrets or environment-specific values.',
  'Add comments only where the code intent is not obvious.',
];

/**
 * Rules specific to data-processing agents.
 */
export const DATA_PROCESSING_RULES: string[] = [
  'Validate all input data before processing.',
  'Handle missing or malformed data gracefully.',
  'Preserve data integrity throughout transformations.',
  'Log any data anomalies encountered.',
];

/**
 * Get rules by category.
 */
export function getRulesByCategory(
  category: 'global' | 'client-facing' | 'code-generation' | 'data-processing'
): string[] {
  switch (category) {
    case 'global':
      return GLOBAL_RULES;
    case 'client-facing':
      return [...GLOBAL_RULES, ...CLIENT_FACING_RULES];
    case 'code-generation':
      return [...GLOBAL_RULES, ...CODE_GENERATION_RULES];
    case 'data-processing':
      return [...GLOBAL_RULES, ...DATA_PROCESSING_RULES];
    default:
      return GLOBAL_RULES;
  }
}
