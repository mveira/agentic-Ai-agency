/** JSON contracts for portal data — must match API response shapes */

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

/** Answer payload for submitting clarification answers */
export interface AnswerPayload {
  questionId: string;
  value: string | string[] | number;
}
