import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Question, QuestionBank } from './types.js';
import { QuestionBankSchema } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default path to the questions repository relative to this package.
 */
export const DEFAULT_QUESTIONS_PATH = join(__dirname, '../../../../agency-questions/questions');

export interface LoadQuestionsOptions {
  basePath?: string;
  clientId?: string;
}

/**
 * Loads questions from the question bank.
 * Fails fast if core.json is missing.
 *
 * @param options - Options for loading questions
 * @returns Array of open questions
 * @throws Error if core.json is missing or invalid
 */
export async function loadQuestions(options: LoadQuestionsOptions = {}): Promise<Question[]> {
  const basePath = options.basePath ?? DEFAULT_QUESTIONS_PATH;
  const corePath = join(basePath, 'core.json');

  // FAIL FAST: core.json must exist
  if (!existsSync(corePath)) {
    throw new Error(
      `Question bank not found at ${corePath}. ` +
        'Ensure ../agency-questions repository exists with questions/core.json'
    );
  }

  // Load and parse core questions
  const coreContent = await readFile(corePath, 'utf-8');
  let questionBank: QuestionBank;

  try {
    const parsed = JSON.parse(coreContent);
    questionBank = QuestionBankSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Invalid question bank format in ${corePath}: ${error}`);
  }

  const questions = [...questionBank.global_questions];

  // Optionally load client-specific questions
  if (options.clientId) {
    const clientPath = join(basePath, 'by-client', `${options.clientId}.json`);
    if (existsSync(clientPath)) {
      try {
        const clientContent = await readFile(clientPath, 'utf-8');
        const clientQuestions = JSON.parse(clientContent);
        if (Array.isArray(clientQuestions)) {
          questions.push(...clientQuestions);
        }
      } catch {
        // Client questions are optional, don't fail
        console.warn(`Failed to load client questions from ${clientPath}`);
      }
    }
  }

  return questions;
}

/**
 * Gets only open (unanswered) questions.
 */
export function getOpenQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.status === 'open');
}

/**
 * Formats questions as a prompt section.
 */
export function formatQuestionsForPrompt(questions: Question[]): string {
  const openQuestions = getOpenQuestions(questions);

  if (openQuestions.length === 0) {
    return '';
  }

  const lines = [
    '## KNOWN UNKNOWNS — DO NOT ASSUME',
    '',
    'The following questions remain unanswered. Do NOT make assumptions about these topics.',
    'If your task requires clarity on any of these, flag it in your `unknowns` output.',
    '',
  ];

  for (const q of openQuestions) {
    lines.push(`- **${q.id}**: ${q.question}`);
    if (q.default) {
      lines.push(`  - Default assumption (if forced): ${q.default}`);
    }
  }

  return lines.join('\n');
}
