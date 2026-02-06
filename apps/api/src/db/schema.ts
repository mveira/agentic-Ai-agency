import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Task run status enum.
 */
export const taskRunStatusEnum = pgEnum('task_run_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'budget_exceeded',
]);

/**
 * Org type enum.
 */
export const orgTypeEnum = pgEnum('org_type', ['agency', 'client']);

/**
 * Membership role enum.
 */
export const membershipRoleEnum = pgEnum('membership_role', [
  'agency_admin',
  'agency_operator',
  'client_admin',
  'client_member',
  'viewer',
]);

/**
 * Orgs table - agencies and client organizations.
 */
export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: orgTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Users table - user profiles (id matches auth provider user id).
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Memberships table - links users to orgs with roles.
 */
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => orgs.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  role: membershipRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Clients table - legacy organizations/businesses using the system.
 * Retained for backward compatibility; new code should use orgs.
 */
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Projects table - work streams owned by an org.
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id),
  clientId: uuid('client_id')
    .references(() => clients.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  dailyBudgetGbp: decimal('daily_budget_gbp', { precision: 10, scale: 4 }).notNull(),
  monthlyBudgetGbp: decimal('monthly_budget_gbp', { precision: 10, scale: 4 }).notNull(),
  dryRun: boolean('dry_run').default(false).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Model pricing table - cost per million tokens for each LLM model.
 */
export const modelPricing = pgTable('model_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: varchar('model_id', { length: 100 }).unique().notNull(),
  inputPricePerMillion: decimal('input_price_per_million', { precision: 10, scale: 6 }).notNull(),
  outputPricePerMillion: decimal('output_price_per_million', { precision: 10, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('GBP').notNull(),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Task runs table - telemetry for each agent task execution.
 */
export const taskRuns = pgTable('task_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  taskType: varchar('task_type', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }).notNull(),
  status: taskRunStatusEnum('status').notNull(),
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Knowledge entry type enum.
 */
export const knowledgeEntryTypeEnum = pgEnum('knowledge_entry_type', [
  'requirement',
  'assumption',
  'decision',
  'design-rule',
  'review',
]);

/**
 * Knowledge entry source enum.
 */
export const knowledgeEntrySourceEnum = pgEnum('knowledge_entry_source', [
  'agent',
  'human',
]);

/**
 * Knowledge entry status enum.
 */
export const knowledgeEntryStatusEnum = pgEnum('knowledge_entry_status', [
  'approved',
  'rejected',
  'superseded',
]);

/**
 * Knowledge entries table — structured knowledge base for projects.
 * Entries represent approved requirements, assumptions, decisions,
 * design rules, and reviews populated from confirmed requirement versions.
 */
export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  type: knowledgeEntryTypeEnum('type').notNull(),
  source: knowledgeEntrySourceEnum('source').notNull(),
  versionRef: text('version_ref'),
  contentJson: jsonb('content_json').notNull(),
  status: knowledgeEntryStatusEnum('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Event status enum for the event bus.
 */
export const eventStatusEnum = pgEnum('event_status', [
  'PENDING',
  'PROCESSING',
  'DONE',
  'FAILED',
  'DEAD_LETTERED',
]);

/**
 * Events table - DB-backed event bus for reliable async processing.
 */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id)
      .notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    status: eventStatusEnum('status').notNull().default('PENDING'),
    payloadJson: jsonb('payload_json').notNull(),
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    nextRunAt: timestamp('next_run_at').defaultNow().notNull(),
    lockedAt: timestamp('locked_at'),
    lockedBy: varchar('locked_by', { length: 100 }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueProjectTypeHash: uniqueIndex('events_project_type_hash_idx').on(
      table.projectId,
      table.type,
      table.payloadHash
    ),
  })
);

/**
 * Proposal version status enum.
 */
export const proposalStatusEnum = pgEnum('proposal_status', [
  'DRAFT',
  'IN_REVIEW',
  'SENT',
  'APPROVED',
  'EXPIRED',
]);

/**
 * Proposal review status enum.
 */
export const proposalReviewStatusEnum = pgEnum('proposal_review_status', [
  'APPROVED',
  'CHANGES_REQUESTED',
]);

/**
 * Proposal action type enum.
 */
export const proposalActionTypeEnum = pgEnum('proposal_action_type', [
  'SENT',
  'VIEWED',
  'APPROVED',
]);

/**
 * Proposal versions table — generated proposals for client projects.
 */
export const proposalVersions = pgTable('proposal_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  requirementsVersionId: uuid('requirements_version_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  status: proposalStatusEnum('status').notNull().default('DRAFT'),
  publicId: varchar('public_id', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at'),
  proposalJson: jsonb('proposal_json').notNull(),
  proposalUiSpecJson: jsonb('proposal_ui_spec_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Proposal reviews table — human review records for proposals.
 */
export const proposalReviews = pgTable('proposal_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalVersionId: uuid('proposal_version_id')
    .references(() => proposalVersions.id)
    .notNull(),
  status: proposalReviewStatusEnum('status').notNull(),
  notes: text('notes'),
  reviewerUserId: uuid('reviewer_user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Proposal actions table — tracks proposal lifecycle events.
 */
export const proposalActions = pgTable('proposal_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalVersionId: uuid('proposal_version_id')
    .references(() => proposalVersions.id)
    .notNull(),
  action: proposalActionTypeEnum('action').notNull(),
  metaJson: jsonb('meta_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * CRM action contract status enum.
 */
export const pipelineContractStatusEnum = pgEnum('pipeline_contract_status', [
  'PENDING',
  'APPLIED',
  'REJECTED',
]);

/**
 * Pipeline action contracts table — stage-move contracts emitted by the pipeline router.
 * Contracts are stored as PENDING and manually applied or rejected during pilot.
 */
export const pipelineActionContracts = pgTable('pipeline_action_contracts', {
  contractId: uuid('contract_id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  targetStage: varchar('target_stage', { length: 50 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull().default('MOVE_STAGE'),
  humanReadableNote: text('human_readable_note').notNull(),
  internalReason: jsonb('internal_reason').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique().notNull(),
  status: pipelineContractStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports for use in application code
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ModelPricing = typeof modelPricing.$inferSelect;
export type NewModelPricing = typeof modelPricing.$inferInsert;
export type TaskRun = typeof taskRuns.$inferSelect;
export type NewTaskRun = typeof taskRuns.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type KnowledgeEntryRow = typeof knowledgeEntries.$inferSelect;
export type NewKnowledgeEntryRow = typeof knowledgeEntries.$inferInsert;
export type ProposalVersion = typeof proposalVersions.$inferSelect;
export type NewProposalVersion = typeof proposalVersions.$inferInsert;
export type ProposalReview = typeof proposalReviews.$inferSelect;
export type NewProposalReview = typeof proposalReviews.$inferInsert;
export type ProposalAction = typeof proposalActions.$inferSelect;
export type NewProposalAction = typeof proposalActions.$inferInsert;
export type PipelineActionContractRow = typeof pipelineActionContracts.$inferSelect;
export type NewPipelineActionContractRow = typeof pipelineActionContracts.$inferInsert;
