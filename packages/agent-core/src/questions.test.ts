import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuestions, getOpenQuestions, formatQuestionsForPrompt } from './questions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, '../../../../agency-questions/questions');

describe('loadQuestions', () => {
  it('loads questions from the question bank', async () => {
    const questions = await loadQuestions({ basePath: QUESTIONS_PATH });

    expect(questions).toBeInstanceOf(Array);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('throws error when question bank is missing', async () => {
    await expect(
      loadQuestions({ basePath: '/nonexistent/path' })
    ).rejects.toThrow('Question bank not found');
  });

  it('returns questions with expected structure', async () => {
    const questions = await loadQuestions({ basePath: QUESTIONS_PATH });

    const firstQuestion = questions[0];
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion).toHaveProperty('id');
    expect(firstQuestion).toHaveProperty('question');
    expect(firstQuestion).toHaveProperty('status');
  });
});

describe('getOpenQuestions', () => {
  it('filters to only open questions', () => {
    const questions = [
      { id: 'q1', question: 'Q1?', status: 'open' as const },
      { id: 'q2', question: 'Q2?', status: 'answered' as const, answer: 'A2' },
      { id: 'q3', question: 'Q3?', status: 'open' as const },
    ];

    const open = getOpenQuestions(questions);

    expect(open).toHaveLength(2);
    expect(open.map((q) => q.id)).toEqual(['q1', 'q3']);
  });

  it('returns empty array when no open questions', () => {
    const questions = [
      { id: 'q1', question: 'Q1?', status: 'answered' as const, answer: 'A1' },
    ];

    const open = getOpenQuestions(questions);

    expect(open).toHaveLength(0);
  });
});

describe('formatQuestionsForPrompt', () => {
  it('formats open questions as prompt section', () => {
    const questions = [
      { id: 'auth-method', question: 'Which auth method?', status: 'open' as const, default: 'oauth' },
      { id: 'db-choice', question: 'Which database?', status: 'open' as const },
    ];

    const formatted = formatQuestionsForPrompt(questions);

    expect(formatted).toContain('KNOWN UNKNOWNS');
    expect(formatted).toContain('auth-method');
    expect(formatted).toContain('Which auth method?');
    expect(formatted).toContain('Default assumption');
    expect(formatted).toContain('oauth');
    expect(formatted).toContain('db-choice');
  });

  it('returns empty string when no open questions', () => {
    const questions = [
      { id: 'q1', question: 'Q1?', status: 'answered' as const, answer: 'A1' },
    ];

    const formatted = formatQuestionsForPrompt(questions);

    expect(formatted).toBe('');
  });
});
