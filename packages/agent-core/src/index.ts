// Types
export type {
  AgentOutput,
  AgentContract,
  Question,
  QuestionBank,
  FrameworkBlock,
  TaskDefinition,
  LLMAdapter,
  LLMCompletionParams,
  LLMCompletionResult,
  AgentRunResult,
  AgentRunnerConfig,
} from './types.js';

export {
  AgentOutputSchema,
  AgentContractSchema,
  QuestionSchema,
  QuestionBankSchema,
} from './types.js';

// Questions
export {
  loadQuestions,
  getOpenQuestions,
  formatQuestionsForPrompt,
  DEFAULT_QUESTIONS_PATH,
} from './questions.js';
export type { LoadQuestionsOptions } from './questions.js';

// Prompt Compiler
export { compilePrompt, validateAgentOutput } from './prompt-compiler.js';
export type { CompiledPrompt, CompilePromptParams } from './prompt-compiler.js';

// Mock LLM
export { MockLLMAdapter, createMockAdapter } from './mock-llm.js';

// Agent Runner
export { AgentRunner } from './agent-runner.js';
export type { RunTaskParams } from './agent-runner.js';

// Specialized Agent Runner (Week 3)
export { SpecializedAgentRunner, createMockSpecializedRunner } from './specialized-runner.js';
export type { SpecializedRunnerConfig, SpecializedRunResult } from './specialized-runner.js';

// LLM Router (Week 3)
export {
  LLMRouter,
  createMockRouter,
  MODEL_TIERS,
  MODEL_DOWNGRADE_PATH,
  CROSS_PROVIDER_FALLBACK,
} from './llm-router.js';
export type { RouterConfig, RouteResult } from './llm-router.js';

// Agent Contracts (Week 3)
export * from './contracts/index.js';

// Execution Guard (Week 4.1)
export { checkAgentExecution, checkActionExecution, formatGuardLog } from './execution-guard.js';
export { ProjectConfigSchema } from './project-config.js';
export type { ProjectConfig, BlockedReason, ExecutionGuardResult } from './project-config.js';

// GHL Actions (Week 4.2)
export {
  ActionExecutor,
  MockGHLAdapter,
  MoveStageActionSchema,
  TriggerWorkflowActionSchema,
  GHLActionSchema,
  computePayloadHash,
} from './ghl-actions.js';
export type {
  GHLAction,
  MoveStageAction,
  TriggerWorkflowAction,
  GHLAdapter,
  GHLPipeline,
  ActionExecutionResult,
  ActionTelemetryEvent,
} from './ghl-actions.js';

// Build Schemas (Week 5)
export {
  FunnelStepSchema,
  ScreenSchema,
  ComponentSchema,
  LayoutBlockSchema,
  AccessibilityRuleSchema,
  ScreenStateSchema,
  ScreenCopySchema,
  MarketingBlueprintSchema,
  UXUISpecSchema,
  CopyPackSchema,
  BuildTaskSchema,
  BuildPlanSchema,
  QCReportSchema,
} from './build-schemas.js';
export type {
  FunnelStep,
  Screen,
  Component,
  LayoutBlock,
  AccessibilityRule,
  ScreenState,
  ScreenCopy,
  MarketingBlueprint,
  UXUISpec,
  CopyPack,
  BuildTask,
  BuildPlan,
  QCReport,
} from './build-schemas.js';

// Build Orchestrator (Week 5)
export {
  BuildOrchestrator,
  InMemoryRequirementsProvider,
  BuildRequestSchema,
  assembleBuildPlan,
} from './build-orchestrator.js';
export type {
  BuildRequest,
  BuildOrchestratorInput,
  BuildOrchestratorResult,
  RequirementsProvider,
  TelemetryEntry,
} from './build-orchestrator.js';

// Build Mocks (Week 5)
export {
  createMockBlueprintOutput,
  createMockUXUISpecOutput,
  createMockCopyPackOutput,
  createMockQCPassOutput,
  createMockQCBlockOutput,
  registerBuildMocks,
} from './build-mocks.js';
