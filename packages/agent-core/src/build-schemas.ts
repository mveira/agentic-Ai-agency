/**
 * Build Pipeline Schemas
 *
 * Zod schemas for every handoff in the Build Orchestrator pipeline:
 * Marketing → UX → Copy → QC → BuildPlan
 *
 * Enforces strict typing at each pipeline boundary.
 */

import { z } from 'zod';

// ─── Sub-Schemas ────────────────────────────────────────────────────────────

export const FunnelStepSchema = z.object({
  stepId: z.string(),
  name: z.string(),
  funnelPosition: z.enum(['tofu', 'mofu', 'bofu']),
  awarenessLevel: z.enum([
    'unaware',
    'problem-aware',
    'solution-aware',
    'product-aware',
    'most-aware',
  ]),
  goal: z.string(),
  contentType: z.string(),
  cta: z.string(),
});

export type FunnelStep = z.infer<typeof FunnelStepSchema>;

export const ComponentSchema = z.object({
  componentId: z.string(),
  type: z.string(),
  props: z.record(z.unknown()).optional(),
  slots: z.array(z.string()).default([]),
});

export type Component = z.infer<typeof ComponentSchema>;

export const LayoutBlockSchema = z.object({
  blockId: z.string(),
  type: z.string(),
  order: z.number().int(),
  components: z.array(z.string()),
});

export type LayoutBlock = z.infer<typeof LayoutBlockSchema>;

export const AccessibilityRuleSchema = z.object({
  ruleId: z.string(),
  level: z.enum(['A', 'AA', 'AAA']),
  description: z.string(),
  applies: z.array(z.string()),
});

export type AccessibilityRule = z.infer<typeof AccessibilityRuleSchema>;

export const ScreenStateSchema = z.object({
  stateId: z.string(),
  screenId: z.string(),
  name: z.string(),
  trigger: z.string(),
  changes: z.record(z.unknown()),
});

export type ScreenState = z.infer<typeof ScreenStateSchema>;

export const ScreenSchema = z.object({
  screenId: z.string(),
  route: z.string(),
  name: z.string(),
  layoutBlocks: z.array(LayoutBlockSchema),
  components: z.array(ComponentSchema),
  slots: z.array(z.string()),
});

export type Screen = z.infer<typeof ScreenSchema>;

export const ScreenCopySchema = z.object({
  screenId: z.string(),
  copies: z.array(
    z.object({
      slotId: z.string(),
      componentId: z.string(),
      copy: z.string(),
    })
  ),
});

export type ScreenCopy = z.infer<typeof ScreenCopySchema>;

// ─── Pipeline Handoff Schemas ───────────────────────────────────────────────

/**
 * Marketing Blueprint — produced by strategy-funnel-agent
 */
export const MarketingBlueprintSchema = z.object({
  goal: z.string(),
  audience: z.string(),
  funnelSteps: z.array(FunnelStepSchema).min(1),
  sectionsNeeded: z.record(z.array(z.string())),
  proofAssets: z.array(z.string()),
  successCriteria: z.array(z.string()).min(1),
  optionalEnhancements: z.array(
    z.object({
      enhancementId: z.string(),
      title: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
    })
  ),
});

export type MarketingBlueprint = z.infer<typeof MarketingBlueprintSchema>;

/**
 * UX/UI Spec — produced by ux-design-agent
 */
export const UXUISpecSchema = z.object({
  routes: z.array(z.string()).min(1),
  screens: z.array(ScreenSchema).min(1),
  states: z.array(ScreenStateSchema),
  accessibility: z.array(AccessibilityRuleSchema),
  optionalDesigns: z.array(
    z.object({
      designId: z.string(),
      enhancementId: z.string(),
      screenId: z.string(),
      description: z.string(),
    })
  ),
});

export type UXUISpec = z.infer<typeof UXUISpecSchema>;

/**
 * Copy Pack — produced by copy-messaging-agent
 */
export const CopyPackSchema = z.object({
  screens: z.array(ScreenCopySchema).min(1),
  optionalCopy: z.array(
    z.object({
      enhancementId: z.string(),
      screenId: z.string(),
      copies: z.array(
        z.object({
          slotId: z.string(),
          componentId: z.string(),
          copy: z.string(),
        })
      ),
    })
  ),
});

export type CopyPack = z.infer<typeof CopyPackSchema>;

/**
 * Build Task — individual task in the build plan
 */
export const BuildTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['page', 'component', 'integration', 'content', 'test']),
  acceptanceCriteria: z.array(z.string()).min(1),
  testNotes: z.array(z.string()),
  dependencies: z.array(z.string()),
});

export type BuildTask = z.infer<typeof BuildTaskSchema>;

/**
 * QC Report — produced by quality-control-agent
 */
export const QCReportSchema = z.object({
  approved: z.boolean(),
  violations: z.array(
    z.object({
      severity: z.enum(['critical', 'major', 'minor', 'suggestion']),
      description: z.string(),
      location: z.string(),
    })
  ),
  blockReason: z.string().optional(),
});

export type QCReport = z.infer<typeof QCReportSchema>;

/**
 * Build Plan — final assembled output of the BuildOrchestrator
 */
export const BuildPlanSchema = z.object({
  projectId: z.string(),
  requirementsVersion: z.string(),
  status: z.enum(['draft', 'approved', 'in-progress', 'completed']),
  core: z.object({
    blueprint: MarketingBlueprintSchema,
    uiSpec: UXUISpecSchema,
    copyPack: CopyPackSchema,
  }),
  optional: z.object({
    enhancements: z.array(
      z.object({
        enhancementId: z.string(),
        title: z.string(),
        description: z.string(),
        impact: z.enum(['low', 'medium', 'high']),
      })
    ),
    designs: z.array(
      z.object({
        designId: z.string(),
        enhancementId: z.string(),
        screenId: z.string(),
        description: z.string(),
      })
    ),
    copy: z.array(
      z.object({
        enhancementId: z.string(),
        screenId: z.string(),
        copies: z.array(
          z.object({
            slotId: z.string(),
            componentId: z.string(),
            copy: z.string(),
          })
        ),
      })
    ),
  }),
  tasks: z.array(BuildTaskSchema).min(1),
  approvalsNeeded: z.array(
    z.object({
      enhancementId: z.string(),
      title: z.string(),
      status: z.enum(['pending', 'approved', 'rejected']),
    })
  ),
  qcReport: QCReportSchema.optional(),
  telemetry: z.array(
    z.object({
      step: z.string(),
      agentId: z.string(),
      durationMs: z.number(),
      tokensIn: z.number(),
      tokensOut: z.number(),
      cost: z.number(),
      model: z.string(),
    })
  ),
});

export type BuildPlan = z.infer<typeof BuildPlanSchema>;
