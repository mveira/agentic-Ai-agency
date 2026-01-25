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
 * Clients table - organizations/businesses using the system.
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
 * Projects table - work streams within a client.
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  dailyBudgetGbp: decimal('daily_budget_gbp', { precision: 10, scale: 4 }).notNull(),
  monthlyBudgetGbp: decimal('monthly_budget_gbp', { precision: 10, scale: 4 }).notNull(),
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

// Type exports for use in application code
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ModelPricing = typeof modelPricing.$inferSelect;
export type NewModelPricing = typeof modelPricing.$inferInsert;
export type TaskRun = typeof taskRuns.$inferSelect;
export type NewTaskRun = typeof taskRuns.$inferInsert;
