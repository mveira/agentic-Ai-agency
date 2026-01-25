/**
 * Quality Control Agent Contract
 *
 * Purpose: Review and validate outputs from Strategy and Copy agents.
 * Can BLOCK execution if violations are found.
 */

import type { AgentContract } from '../types.js';
import { z } from 'zod';

export const QUALITY_CONTROL_AGENT_CONTRACT: AgentContract = {
  agentId: 'quality-control-agent',
  name: 'Quality Control Agent',
  description:
    'Reviews and validates outputs from Strategy and Copy agents. ' +
    'Checks for framework compliance, assumption violations, and quality standards. ' +
    'Has authority to BLOCK execution if critical violations are found.',
  capabilities: [
    'Validate strategy against Hormozi value equation',
    'Check copy against awareness level requirements',
    'Verify proof elements are properly used',
    'Detect unaddressed objections',
    'Identify unauthorized assumptions',
    'Flag missing required elements',
    'Approve or reject outputs with clear reasoning',
  ],
  constraints: [
    'Do NOT modify the content being reviewed',
    'Do NOT make subjective quality judgments',
    'Must cite specific rules when flagging violations',
    'Must provide actionable remediation steps',
    'Do NOT pass outputs with critical violations',
    'Must review against ALL applicable frameworks',
  ],
  maxOutputTokens: 4096,
};

/**
 * Required inputs for the Quality Control Agent
 */
export const QualityControlAgentInputSchema = z.object({
  projectId: z.string().uuid(),
  reviewType: z.enum(['strategy-review', 'copy-review', 'full-review']),
  contentToReview: z.object({
    type: z.string(),
    content: z.unknown(),
    sourceAgent: z.string(),
    frameworks: z.array(z.string()).describe('Frameworks that should have been applied'),
  }),
  originalRequirements: z.object({
    awarenessLevel: z.enum(['unaware', 'problem-aware', 'solution-aware', 'product-aware', 'most-aware']).optional(),
    persuasionFramework: z.enum(['pas', 'aida']).optional(),
    requiredProofElements: z.array(z.string()).optional(),
    objections: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }),
  strictMode: z.boolean().default(true).describe('If true, any violation blocks approval'),
});

export type QualityControlAgentInput = z.infer<typeof QualityControlAgentInputSchema>;

/**
 * Violation severity levels
 */
export const ViolationSeverity = z.enum(['critical', 'major', 'minor', 'suggestion']);
export type ViolationSeverityType = z.infer<typeof ViolationSeverity>;

/**
 * Output schema for the Quality Control Agent
 */
export const QualityControlAgentOutputSchema = z.object({
  result: z.object({
    approved: z.boolean(),
    overallScore: z.number().min(0).max(100),
    violations: z.array(
      z.object({
        id: z.string(),
        severity: ViolationSeverity,
        category: z.enum([
          'framework-violation',
          'awareness-mismatch',
          'missing-proof',
          'unaddressed-objection',
          'unauthorized-assumption',
          'schema-violation',
          'constraint-violation',
        ]),
        description: z.string(),
        location: z.string().describe('Where in the content the violation occurs'),
        ruleViolated: z.string().describe('The specific rule or requirement violated'),
        remediation: z.string().describe('How to fix the violation'),
      })
    ),
    frameworkCompliance: z.array(
      z.object({
        framework: z.string(),
        compliant: z.boolean(),
        score: z.number().min(0).max(100),
        notes: z.string(),
      })
    ),
    checklist: z.array(
      z.object({
        item: z.string(),
        passed: z.boolean(),
        notes: z.string().optional(),
      })
    ),
    blockReason: z.string().optional().describe('If not approved, the primary reason'),
    recommendations: z.array(z.string()),
  }),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
});

export type QualityControlAgentOutput = z.infer<typeof QualityControlAgentOutputSchema>;

/**
 * Frameworks required by this agent (all frameworks to validate against)
 */
export const QUALITY_CONTROL_AGENT_FRAMEWORKS: string[] = [
  'offer-economics',
  'market-awareness',
  'persuasion',
  'funnel-design',
];

/**
 * LLM routing preference - Claude Sonnet for analytical review
 */
export const QUALITY_CONTROL_AGENT_MODEL = 'claude-3-sonnet';

/**
 * Per-agent cost cap (GBP)
 */
export const QUALITY_CONTROL_AGENT_COST_CAP = 0.50;

/**
 * Determines if violations should block approval
 */
export function shouldBlock(
  violations: Array<{ severity: ViolationSeverityType }>,
  strictMode: boolean
): boolean {
  if (violations.some((v) => v.severity === 'critical')) {
    return true;
  }
  if (strictMode && violations.some((v) => v.severity === 'major')) {
    return true;
  }
  return false;
}
