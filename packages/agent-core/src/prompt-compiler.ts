import type { AgentContract, FrameworkBlock, TaskDefinition, Question } from './types.js';
import { AgentOutputSchema } from './types.js';
import { formatQuestionsForPrompt } from './questions.js';
import { createHash } from 'node:crypto';

export interface CompiledPrompt {
  text: string;
  hash: string;
  sections: string[];
}

export interface CompilePromptParams {
  globalRules: string[];
  contract: AgentContract;
  frameworkBlocks: FrameworkBlock[];
  task: TaskDefinition;
  questions: Question[];
}

/**
 * Compiles a prompt from multiple sources into a single, structured prompt.
 */
export function compilePrompt(params: CompilePromptParams): CompiledPrompt {
  const { globalRules, contract, frameworkBlocks, task, questions } = params;

  const sections: string[] = [];

  // 1. Global Rules
  if (globalRules.length > 0) {
    sections.push(formatGlobalRules(globalRules));
  }

  // 2. Agent Contract
  sections.push(formatAgentContract(contract));

  // 3. Framework Blocks (sorted by priority)
  const sortedBlocks = [...frameworkBlocks].sort((a, b) => a.priority - b.priority);
  for (const block of sortedBlocks) {
    sections.push(formatFrameworkBlock(block));
  }

  // 4. Task Prompt
  sections.push(formatTaskPrompt(task));

  // 5. Known Unknowns (from question bank)
  const questionsSection = formatQuestionsForPrompt(questions);
  if (questionsSection) {
    sections.push(questionsSection);
  }

  // 6. Output Schema Enforcement
  sections.push(formatOutputSchema());

  const text = sections.join('\n\n---\n\n');
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);

  return {
    text,
    hash,
    sections,
  };
}

function formatGlobalRules(rules: string[]): string {
  const lines = ['## GLOBAL RULES', '', 'You MUST follow these rules at all times:', ''];
  for (const rule of rules) {
    lines.push(`- ${rule}`);
  }
  return lines.join('\n');
}

function formatAgentContract(contract: AgentContract): string {
  const lines = [
    '## AGENT CONTRACT',
    '',
    `**Agent ID:** ${contract.agentId}`,
    `**Name:** ${contract.name}`,
    `**Description:** ${contract.description}`,
    '',
    '### Capabilities',
  ];

  for (const cap of contract.capabilities) {
    lines.push(`- ${cap}`);
  }

  lines.push('', '### Constraints');
  for (const constraint of contract.constraints) {
    lines.push(`- ${constraint}`);
  }

  lines.push('', `**Max Output Tokens:** ${contract.maxOutputTokens}`);

  return lines.join('\n');
}

function formatFrameworkBlock(block: FrameworkBlock): string {
  return `## ${block.name.toUpperCase()}\n\n${block.content}`;
}

function formatTaskPrompt(task: TaskDefinition): string {
  const lines = [
    '## TASK',
    '',
    `**Task ID:** ${task.taskId}`,
    `**Task Type:** ${task.taskType}`,
    `**Project ID:** ${task.projectId}`,
    '',
    '### Instructions',
    '',
    task.prompt,
  ];

  if (task.context && Object.keys(task.context).length > 0) {
    lines.push('', '### Context', '', '```json', JSON.stringify(task.context, null, 2), '```');
  }

  return lines.join('\n');
}

function formatOutputSchema(): string {
  const schemaDescription = `{
  "result": <any>,           // The main output of your task
  "assumptions": [string],   // List any assumptions you made
  "unknowns": [string],      // List anything unclear that needs clarification
  "next_actions": [string]   // Suggested follow-up actions
}`;

  return `## OUTPUT FORMAT

You MUST respond with valid JSON matching this exact schema:

\`\`\`json
${schemaDescription}
\`\`\`

- Do NOT include any text before or after the JSON
- Do NOT use markdown code fences in your response
- ONLY output the raw JSON object`;
}

/**
 * Validates that a response conforms to the agent output schema.
 */
export function validateAgentOutput(response: string): {
  valid: boolean;
  output?: unknown;
  error?: string;
} {
  let parsed: unknown;

  try {
    // Try to extract JSON from response (in case of markdown fences)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : response.trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      valid: false,
      error: 'Response is not valid JSON',
    };
  }

  const result = AgentOutputSchema.safeParse(parsed);

  if (!result.success) {
    return {
      valid: false,
      error: `Schema validation failed: ${result.error.message}`,
    };
  }

  return {
    valid: true,
    output: result.data,
  };
}
