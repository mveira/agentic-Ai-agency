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

// Real LLM Adapters
export {
  ClaudeAdapter,
  createClaudeAdapterFromEnv,
  ClaudeAPIError,
  ClaudeRateLimitError,
  ClaudeTimeoutError,
} from './llm-adapters/index.js';
export type { ClaudeAdapterConfig } from './llm-adapters/index.js';

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

// Business Architect Planner (Step 3)
export { BusinessArchitectPlanner, createMockPlannerOutput } from './business-architect-planner.js';
export type { PlannerInput, PlannerResult, PlannerConfig } from './business-architect-planner.js';

// Event Bus (Event Bus A)
export {
  InMemoryEventStore,
  publishEvent,
  markProcessing,
  markDone,
  markFailed,
  markDeadLetter,
  computeEventHash,
} from './event-bus.js';
export type {
  SystemEvent,
  EventStatus,
  EventStore,
  PublishEventParams,
  PublishEventResult,
} from './event-bus.js';

// Event Worker (Event Bus A)
export { EventWorker, createDefaultHandlers } from './event-worker.js';
export type {
  EventHandler,
  EventWorkerConfig,
  ProcessResult,
} from './event-worker.js';

// Requirements Schemas (Step 4)
export {
  RequirementSchema,
  AssumptionSchema,
  RequirementsBundleSchema,
  ConfirmPayloadSchema,
  ChangeRequestSchema,
  RequirementsVersionSchema,
} from './requirements-schemas.js';
export type {
  Requirement as RequirementItem,
  Assumption as AssumptionItem,
  RequirementsBundle,
  ConfirmPayload,
  ChangeRequest,
  RequirementsVersion as RequirementsVersionRecord,
} from './requirements-schemas.js';

// Requirements Version Store (Step 4)
export {
  InMemoryRequirementsVersionStore,
  StoreBackedRequirementsProvider,
} from './requirements-store.js';
export type { RequirementsVersionStore } from './requirements-store.js';

// Requirements Engineer Planner (Step 4)
export {
  RequirementsEngineerPlanner,
  createMockBundleOutput,
} from './requirements-engineer-planner.js';
export type {
  RequirementsPlannerInput,
  RequirementsPlannerResult,
  RequirementsPlannerConfig,
} from './requirements-engineer-planner.js';

// Requirements Hooks (Step 4)
export {
  buildGenerateHooks,
  buildReviewApprovedHooks,
} from './requirements-hooks.js';
export type {
  MilestoneHook,
  GenerateHookParams,
  ReviewApprovedHookParams,
} from './requirements-hooks.js';

// Knowledge Schemas (Step 4.5)
export {
  KnowledgeEntryTypeSchema,
  KnowledgeEntrySourceSchema,
  KnowledgeEntryStatusSchema,
  KnowledgeEntrySchema,
} from './knowledge-schemas.js';
export type {
  KnowledgeEntryType,
  KnowledgeEntrySource,
  KnowledgeEntryStatus,
  KnowledgeEntry,
} from './knowledge-schemas.js';

// Knowledge Store (Step 4.5)
export { InMemoryKnowledgeStore } from './knowledge-store.js';
export type { KnowledgeStore } from './knowledge-store.js';

// Knowledge Populator (Step 4.5)
export { populateKBFromConfirmation } from './knowledge-populator.js';
export type { PopulateKBResult } from './knowledge-populator.js';

// Knowledge Tools (Step 4.5)
export {
  getApprovedRequirements,
  getApprovedAssumptions,
  getDecisions,
  getDesignRules,
  getReviews,
  getRejectedAssumptions,
  KB_TOOL_REGISTRY,
} from './knowledge-tools.js';
export type { KBToolResult, KBToolResultEntry, KBToolFn } from './knowledge-tools.js';

// Knowledge Tool Telemetry (Step 4.5)
export { logToolUsage } from './knowledge-tool-telemetry.js';
export type { LogToolUsageParams } from './knowledge-tool-telemetry.js';

// Knowledge Agent Integration (Step 4.5)
export { AGENT_KB_TOOL_ACCESS, loadKBForAgent } from './knowledge-agent-integration.js';
export type { KBLoadResult } from './knowledge-agent-integration.js';

// Proposal Schemas (Step 5)
export {
  ProposalStatusSchema,
  ProposalScopeItemSchema,
  ProposalAddOnSchema,
  ComplianceFlagsSchema,
  ProposalJsonSchema,
  ProposalUiSpecJsonSchema,
  ProposalReviewStatusSchema,
  ProposalReviewSchema,
  ProposalActionTypeSchema,
  StrapiPricingPackageSchema,
  StrapiProposalTemplateSchema,
  StrapiPersuasionFrameworkSchema,
  StrapiHormoziFrameworkSchema,
  StrapiTimelineRuleSchema,
  ProposalCRMSentActionSchema,
  ProposalCRMApprovedActionSchema,
} from './proposal-schemas.js';
export type {
  ProposalStatus,
  ProposalScopeItem,
  ProposalAddOn,
  ComplianceFlags,
  ProposalJson,
  ProposalUiSpecJson,
  ProposalReviewStatus,
  ProposalReviewInput,
  ProposalActionType,
  StrapiPricingPackage,
  StrapiProposalTemplate,
  StrapiPersuasionFramework,
  StrapiHormoziFramework,
  StrapiTimelineRule,
  ProposalStrapiProvider,
  ProposalCRMSentAction,
  ProposalCRMApprovedAction,
} from './proposal-schemas.js';

// Proposal Orchestrator (Step 5)
export {
  ProposalOrchestrator,
  InMemoryProposalStrapiProvider,
  InMemoryProposalStore,
  generatePublicId,
  buildProposalSentCRMAction,
  buildProposalApprovedCRMAction,
} from './proposal-orchestrator.js';
export type {
  ProposalOrchestratorInput,
  ProposalOrchestratorResult,
  ProposalTelemetryEntry,
  StoredProposal,
  StoredProposalReview,
  StoredProposalAction,
  ProposalStore,
} from './proposal-orchestrator.js';

// PM Schemas (Step 6.0.1)
export {
  ProjectPhaseSchema,
  ReadinessStatusSchema,
  BlockerTypeSchema,
  BlockerSeveritySchema,
  BlockerReferenceSchema,
  BlockerSchema,
  GatesSchema,
  NextAllowedActionSchema,
  SuggestedAutomationSchema,
  ProjectReadinessReportSchema,
  CompletionSchema,
  CostsSchema,
  HealthSchema,
  ProjectOpsSummarySchema,
} from './pm-schemas.js';
export type {
  ProjectPhase,
  ReadinessStatus,
  BlockerType,
  BlockerSeverity,
  BlockerReference,
  Blocker,
  Gates,
  NextAllowedAction,
  SuggestedAutomation,
  ProjectReadinessReport,
  Completion,
  Costs,
  Health,
  ProjectOpsSummary,
} from './pm-schemas.js';

// PM Engine (Step 6.0.1)
export { PMEngine, withPMMetrics } from './pm-engine.js';
export type { PMDataProvider, PMEngineConfig, PMComputeMetrics } from './pm-engine.js';

// Skills
export {
  loadSkill,
  loadSkills,
  SkillNotFoundError,
  InvalidSkillIdError,
} from './skills/index.js';
export type { SkillId, LoadedSkill } from './skills/index.js';

// Pipeline Router
export {
  PipelineStageNameSchema,
  PipelineStageConfigSchema,
  PipelineEventType,
  PipelineEventTypeSchema,
  PipelineRouterInputSchema,
  computePipelineAction,
  PipelineActionContractSchema,
  PipelineContractStatusSchema,
  StoredPipelineContractSchema,
  InMemoryPipelineContractStore,
} from './pipeline/index.js';
export type {
  PipelineStageName,
  PipelineStageConfig,
  PipelineRouterInput,
  PipelineActionContract,
  PipelineContractStatus,
  StoredPipelineContract,
  PipelineContractStore,
} from './pipeline/index.js';
