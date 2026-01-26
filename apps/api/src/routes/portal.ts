import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// ─── Shared Types (JSON contracts) ───────────────────────────────────────────

export interface IntakeField {
  label: string;
  value: string;
}

export interface LeadIntake {
  id: string;
  projectId: string;
  source: string;
  submittedAt: string;
  fields: IntakeField[];
  status: 'received' | 'in_review' | 'processed';
}

export type QuestionInputType =
  | 'single_select'
  | 'multi_select'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date';

export interface ClarificationQuestion {
  id: string;
  text: string;
  inputType: QuestionInputType;
  required: boolean;
  options?: string[];
  answer: string | string[] | number | null;
}

export interface ClarificationSession {
  id: string;
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed';
  questions: ClarificationQuestion[];
  understanding: UnderstandingSummary | null;
}

export interface UnderstandingSummary {
  summary: string[];
  confidence: number;
  followUpNeeded: boolean;
}

export interface Requirement {
  id: string;
  category: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  confirmed: boolean | null;
  changeNote?: string;
}

export interface Assumption {
  id: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string | null;
}

export interface RequirementsVersion {
  versionId: string;
  projectId: string;
  status: 'pending_confirmation' | 'confirmed' | 'regenerating';
  requirements: Requirement[];
  assumptions: Assumption[];
}

export interface ReviewTimelineEvent {
  event: string;
  timestamp: string;
  status: 'done' | 'in_progress' | 'pending';
}

export interface ReviewStatus {
  versionId: string;
  projectId: string;
  status: 'in_review' | 'approved' | 'changes_requested';
  requirementsConfirmed: number;
  requirementsTotal: number;
  assumptionsApproved: number;
  assumptionsTotal: number;
  blockers: string[];
  timeline: ReviewTimelineEvent[];
}

// ─── Stub Data ───────────────────────────────────────────────────────────────

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

const STUB_INTAKE: LeadIntake = {
  id: 'intake-001',
  projectId: TEST_PROJECT_ID,
  source: 'ghl_form',
  submittedAt: '2026-01-26T10:00:00Z',
  fields: [
    { label: 'Business Name', value: 'Acme Corp' },
    { label: 'Website', value: 'https://acme.com' },
    { label: 'Goal', value: 'Generate more leads for our SaaS product' },
    { label: 'Budget Range', value: '£2,000 - £5,000' },
    { label: 'Timeline', value: '4 weeks' },
  ],
  status: 'received',
};

const STUB_SESSION: ClarificationSession = {
  id: 'session-001',
  projectId: TEST_PROJECT_ID,
  status: 'in_progress',
  questions: [
    {
      id: 'q-1',
      text: 'Who is your primary target audience?',
      inputType: 'short_text',
      required: true,
      answer: null,
    },
    {
      id: 'q-2',
      text: 'Which services do you currently offer?',
      inputType: 'multi_select',
      required: true,
      options: ['Web Design', 'SEO', 'PPC Advertising', 'Social Media', 'Email Marketing', 'Content Strategy'],
      answer: null,
    },
    {
      id: 'q-3',
      text: 'What is the primary goal for this project?',
      inputType: 'single_select',
      required: true,
      options: ['Lead Generation', 'Brand Awareness', 'Direct Sales', 'Customer Retention'],
      answer: null,
    },
    {
      id: 'q-4',
      text: 'Describe your ideal customer in detail.',
      inputType: 'long_text',
      required: false,
      answer: null,
    },
    {
      id: 'q-5',
      text: 'What is your monthly marketing budget?',
      inputType: 'number',
      required: true,
      answer: null,
    },
    {
      id: 'q-6',
      text: 'When do you want to launch?',
      inputType: 'date',
      required: true,
      answer: null,
    },
  ],
  understanding: null,
};

const STUB_REQUIREMENTS: RequirementsVersion = {
  versionId: 'v1.0',
  projectId: TEST_PROJECT_ID,
  status: 'pending_confirmation',
  requirements: [
    {
      id: 'req-1',
      category: 'design',
      description: 'Landing page with hero section, value proposition, and CTA above fold',
      priority: 'must-have',
      confirmed: null,
    },
    {
      id: 'req-2',
      category: 'design',
      description: 'Social proof section with testimonials and trust badges',
      priority: 'must-have',
      confirmed: null,
    },
    {
      id: 'req-3',
      category: 'copy',
      description: 'Headline and subheadline using PAS framework',
      priority: 'must-have',
      confirmed: null,
    },
    {
      id: 'req-4',
      category: 'functionality',
      description: 'Lead capture form with email and name fields',
      priority: 'must-have',
      confirmed: null,
    },
    {
      id: 'req-5',
      category: 'functionality',
      description: 'Thank you page with next steps',
      priority: 'should-have',
      confirmed: null,
    },
    {
      id: 'req-6',
      category: 'analytics',
      description: 'Conversion tracking with Google Analytics 4',
      priority: 'should-have',
      confirmed: null,
    },
    {
      id: 'req-7',
      category: 'design',
      description: 'Mobile-first responsive design',
      priority: 'must-have',
      confirmed: null,
    },
    {
      id: 'req-8',
      category: 'enhancement',
      description: 'Exit-intent popup with discount offer',
      priority: 'nice-to-have',
      confirmed: null,
    },
  ],
  assumptions: [
    {
      id: 'asn-1',
      text: 'Client wants a modern, minimal design aesthetic',
      status: 'pending',
      comment: null,
    },
    {
      id: 'asn-2',
      text: 'Primary conversion goal is email signup, not direct purchase',
      status: 'pending',
      comment: null,
    },
    {
      id: 'asn-3',
      text: 'Client will provide brand assets (logo, colors, fonts)',
      status: 'pending',
      comment: null,
    },
    {
      id: 'asn-4',
      text: 'The landing page is standalone, not part of an existing site',
      status: 'pending',
      comment: null,
    },
  ],
};

const STUB_REVIEW: ReviewStatus = {
  versionId: 'v1.0',
  projectId: TEST_PROJECT_ID,
  status: 'in_review',
  requirementsConfirmed: 0,
  requirementsTotal: 8,
  assumptionsApproved: 0,
  assumptionsTotal: 4,
  blockers: [],
  timeline: [
    { event: 'Discovery form submitted', timestamp: '2026-01-26T10:00:00Z', status: 'done' },
    { event: 'Clarification interview completed', timestamp: '2026-01-26T10:30:00Z', status: 'done' },
    { event: 'Requirements generated', timestamp: '2026-01-26T10:35:00Z', status: 'done' },
    { event: 'Client review', timestamp: '2026-01-26T10:40:00Z', status: 'in_progress' },
    { event: 'Build plan generation', timestamp: '', status: 'pending' },
  ],
};

// ─── Router ──────────────────────────────────────────────────────────────────

const portalRouter = new Hono();

/**
 * GET /api/projects/:id/intakes/:leadIntakeId
 */
portalRouter.get('/:id/intakes/:leadIntakeId', (c) => {
  const projectId = c.req.param('id');
  const leadIntakeId = c.req.param('leadIntakeId');

  return c.json({
    ...STUB_INTAKE,
    id: leadIntakeId,
    projectId,
  });
});

/**
 * GET /api/clarification/sessions/:sessionId
 */
const clarificationRouter = new Hono();

clarificationRouter.get('/sessions/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');

  return c.json({
    ...STUB_SESSION,
    id: sessionId,
  });
});

/**
 * POST /api/clarification/sessions/:sessionId/answers
 */
const AnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([z.string(), z.array(z.string()), z.number()]),
    })
  ),
});

clarificationRouter.post(
  '/sessions/:sessionId/answers',
  zValidator('json', AnswersSchema),
  (c) => {
    const body = c.req.valid('json');

    // Validate required questions have answers
    const answeredIds = new Set(body.answers.map((a) => a.questionId));
    const missingRequired = STUB_SESSION.questions
      .filter((q) => q.required && !answeredIds.has(q.id))
      .map((q) => q.id);

    if (missingRequired.length > 0) {
      return c.json(
        {
          success: false,
          error: 'Missing required answers',
          missingQuestions: missingRequired,
        },
        400
      );
    }

    const understanding: UnderstandingSummary = {
      summary: [
        'Target audience: Small business owners in SaaS',
        'Primary goal: Lead generation via landing page',
        'Budget: £2,000-5,000 range',
        'Timeline: 4 weeks to launch',
        'Design preference: Modern, minimal aesthetic',
      ],
      confidence: 0.87,
      followUpNeeded: false,
    };

    return c.json({
      success: true,
      understanding,
    });
  }
);

/**
 * GET /api/requirements/:versionId
 */
const requirementsRouter = new Hono();

requirementsRouter.get('/:versionId', (c) => {
  const versionId = c.req.param('versionId');

  return c.json({
    ...STUB_REQUIREMENTS,
    versionId,
  });
});

/**
 * POST /api/requirements/:versionId/confirm
 */
const ConfirmSchema = z.object({
  requirements: z.array(
    z.object({
      id: z.string(),
      confirmed: z.boolean(),
      changeNote: z.string().optional(),
    })
  ),
  assumptions: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['approved', 'rejected']),
      comment: z.string().optional(),
    })
  ),
});

requirementsRouter.post(
  '/:versionId/confirm',
  zValidator('json', ConfirmSchema),
  (c) => {
    const versionId = c.req.param('versionId');
    const body = c.req.valid('json');

    const hasRejections =
      body.requirements.some((r) => !r.confirmed) ||
      body.assumptions.some((a) => a.status === 'rejected');

    return c.json({
      success: true,
      versionId,
      status: hasRejections ? 'regenerating' : 'confirmed',
      confirmedCount: body.requirements.filter((r) => r.confirmed).length,
      totalCount: body.requirements.length,
    });
  }
);

/**
 * GET /api/reviews/:versionId
 */
const reviewsRouter = new Hono();

reviewsRouter.get('/:versionId', (c) => {
  const versionId = c.req.param('versionId');

  return c.json({
    ...STUB_REVIEW,
    versionId,
  });
});

// ─── Plan-Next Types ──────────────────────────────────────────────────────────

export interface PlannedQuestion {
  key: string;
  text: string;
  inputType: QuestionInputType;
  options?: string[];
  required: boolean;
  helpText?: string;
}

export interface PlanNextResult {
  sessionId: string;
  round: number;
  readiness: number;
  summary: string[];
  questions: PlannedQuestion[];
  blockReason: string | null;
}

export interface ApproveQuestionsResult {
  sessionId: string;
  round: number;
  approved: boolean;
  questionsPublished: number;
}

// ─── Plan-Next Stub Data ──────────────────────────────────────────────────────

function createStubPlanNext(sessionId: string, round: number): PlanNextResult {
  if (round === 1) {
    return {
      sessionId,
      round,
      readiness: 0.3,
      summary: [
        'Basic business info captured from intake form',
        'Missing: target audience detail, competitive landscape, success metrics',
      ],
      questions: [
        {
          key: 'target_audience',
          text: 'Who is your primary target audience?',
          inputType: 'short_text',
          required: true,
          helpText: 'Describe the ideal customer for this project.',
        },
        {
          key: 'competitors',
          text: 'Who are your main competitors?',
          inputType: 'long_text',
          required: false,
          helpText: 'List 2–3 competitors and what they do well.',
        },
        {
          key: 'project_goal',
          text: 'What is the primary goal for this project?',
          inputType: 'single_select',
          options: ['Lead Generation', 'Brand Awareness', 'Direct Sales', 'Customer Retention'],
          required: true,
        },
        {
          key: 'services',
          text: 'Which services do you currently offer?',
          inputType: 'multi_select',
          options: ['Web Design', 'SEO', 'PPC', 'Social Media', 'Email Marketing', 'Content Strategy'],
          required: true,
        },
        {
          key: 'budget',
          text: 'What is your monthly marketing budget?',
          inputType: 'number',
          required: true,
          helpText: 'In GBP.',
        },
      ],
      blockReason: null,
    };
  }

  // Round 2+ = higher readiness, fewer questions
  return {
    sessionId,
    round,
    readiness: 0.85,
    summary: [
      'Target audience: SaaS founders',
      'Primary goal: Lead generation',
      'Budget: £3,000/month',
      'Services: SEO, PPC',
      'Missing: timeline and design preferences',
    ],
    questions: [
      {
        key: 'timeline',
        text: 'When do you want to launch?',
        inputType: 'date',
        required: true,
      },
      {
        key: 'design_style',
        text: 'What design style do you prefer?',
        inputType: 'single_select',
        options: ['Modern & Minimal', 'Bold & Vibrant', 'Corporate & Professional', 'Playful & Creative'],
        required: true,
        helpText: 'This guides the visual direction of your project.',
      },
    ],
    blockReason: null,
  };
}

/**
 * POST /api/clarification/sessions/:sessionId/plan-next
 *
 * Invokes BusinessArchitectAgent to plan the next round of questions.
 * Returns readiness score, understanding summary, and planned questions.
 */
const PlanNextSchema = z.object({
  round: z.number().int().min(1),
  intakeData: z.record(z.unknown()).optional(),
  priorAnswers: z
    .array(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number()]),
      })
    )
    .optional(),
});

clarificationRouter.post(
  '/sessions/:sessionId/plan-next',
  zValidator('json', PlanNextSchema),
  (c) => {
    const sessionId = c.req.param('sessionId');
    const body = c.req.valid('json');

    const result = createStubPlanNext(sessionId, body.round);
    return c.json(result);
  }
);

/**
 * POST /api/clarification/sessions/:sessionId/approve-questions
 *
 * Agency approval gate: reviews planned questions before they're shown to client.
 */
const ApproveQuestionsSchema = z.object({
  round: z.number().int().min(1),
  approved: z.boolean(),
  removedKeys: z.array(z.string()).optional().describe('Question keys removed by agency'),
  editedQuestions: z
    .array(
      z.object({
        key: z.string(),
        text: z.string().optional(),
        helpText: z.string().optional(),
      })
    )
    .optional()
    .describe('Questions edited by agency'),
});

clarificationRouter.post(
  '/sessions/:sessionId/approve-questions',
  zValidator('json', ApproveQuestionsSchema),
  (c) => {
    const sessionId = c.req.param('sessionId');
    const body = c.req.valid('json');

    if (!body.approved) {
      return c.json({
        sessionId,
        round: body.round,
        approved: false,
        questionsPublished: 0,
      } satisfies ApproveQuestionsResult);
    }

    // Simulate publishing: count questions minus removed
    const removedCount = body.removedKeys?.length ?? 0;
    const stubPlan = createStubPlanNext(sessionId, body.round);
    const publishedCount = stubPlan.questions.length - removedCount;

    return c.json({
      sessionId,
      round: body.round,
      approved: true,
      questionsPublished: Math.max(0, publishedCount),
    } satisfies ApproveQuestionsResult);
  }
);

export { portalRouter, clarificationRouter, requirementsRouter, reviewsRouter };
