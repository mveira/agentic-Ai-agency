import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  AgentRunner,
  createMockAdapter,
  type AgentContract,
  type TaskDefinition,
  type FrameworkBlock,
} from '@agency/agent-core';
import { GLOBAL_RULES, getFrameworkByName } from '@agency/prompt-library';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../../agency-questions/questions');

const taskRouter = new Hono();

const RunTaskRequestSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string(),
  taskType: z.string(),
  prompt: z.string(),
  agent: z.object({
    agentId: z.string(),
    name: z.string(),
    description: z.string(),
    capabilities: z.array(z.string()),
    constraints: z.array(z.string()),
    maxOutputTokens: z.number().int().positive().default(4096),
  }),
  frameworks: z.array(z.string()).optional(),
  context: z.record(z.unknown()).optional(),
  budget: z
    .object({
      dailyBudgetGbp: z.number().positive(),
      monthlyBudgetGbp: z.number().positive(),
    })
    .optional(),
});

type RunTaskRequest = z.infer<typeof RunTaskRequestSchema>;

/**
 * POST /api/run-task
 *
 * Executes an agent task with full orchestration:
 * - Loads questions from the question bank
 * - Compiles prompt with global rules, agent contract, frameworks
 * - Enforces budget limits
 * - Validates output schema
 * - Records telemetry
 */
taskRouter.post('/', zValidator('json', RunTaskRequestSchema), async (c) => {
  const body = c.req.valid('json') as RunTaskRequest;

  // Create agent runner with mock adapter
  const runner = new AgentRunner({
    questionsPath: QUESTIONS_PATH,
    globalRules: GLOBAL_RULES,
    llmAdapter: createMockAdapter(),
    defaultModel: 'mock',
    projectBudget: body.budget,
  });

  // Build agent contract
  const contract: AgentContract = {
    agentId: body.agent.agentId,
    name: body.agent.name,
    description: body.agent.description,
    capabilities: body.agent.capabilities,
    constraints: body.agent.constraints,
    maxOutputTokens: body.agent.maxOutputTokens,
  };

  // Build task definition
  const task: TaskDefinition = {
    taskId: body.taskId,
    taskType: body.taskType,
    projectId: body.projectId,
    prompt: body.prompt,
    context: body.context,
  };

  // Load frameworks by name
  const frameworkBlocks: FrameworkBlock[] = [];
  if (body.frameworks) {
    for (const name of body.frameworks) {
      const framework = getFrameworkByName(name);
      if (framework) {
        frameworkBlocks.push(framework);
      }
    }
  }

  try {
    const result = await runner.runTask({
      contract,
      task,
      frameworkBlocks,
    });

    return c.json({
      success: result.success,
      output: result.output,
      error: result.error,
      telemetry: result.telemetry,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: message,
        telemetry: null,
      },
      500
    );
  }
});

export { taskRouter };
