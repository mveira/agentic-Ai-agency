import type { PipelineRouterInput } from './pipeline-events.js';
import type { PipelineStageName } from './pipeline-stages.js';

// ─── CRM Action Contract ────────────────────────────────────────────────────

export interface CRMActionContract {
  type: 'MOVE_STAGE' | 'TRIGGER_WORKFLOW' | 'ADD_NOTE';
  targetStage?: PipelineStageName;
  workflowId?: string;
  note?: string;
  reason: string;
}

// ─── Pipeline Router (Pure, Deterministic) ───────────────────────────────────

export function computeCrmActions(input: PipelineRouterInput): CRMActionContract[] {
  const { triggeringEvent, gateState } = input;

  switch (triggeringEvent) {
    case 'INTENT_RECEIVED':
      return [{ type: 'MOVE_STAGE', targetStage: 'NEW_LEAD', reason: 'New lead intent received' }];

    case 'ACK_SENT':
      return [{ type: 'MOVE_STAGE', targetStage: 'IN_REVIEW', reason: 'Acknowledgement sent to lead' }];

    case 'SAFETY_CHECK_COMPLETED': {
      if (gateState.safetyCheck !== 'passed') {
        return [{ type: 'ADD_NOTE', note: `Safety check did not pass (status: ${gateState.safetyCheck})`, reason: 'Safety check gate not passed' }];
      }
      if (gateState.clarification === 'needed') {
        return [{ type: 'MOVE_STAGE', targetStage: 'CLARIFICATION', reason: 'Safety check passed; clarification needed' }];
      }
      return [{ type: 'MOVE_STAGE', targetStage: 'IN_REVIEW', reason: 'Safety check passed; no clarification needed' }];
    }

    case 'CLARIFICATION_SESSION_CREATED':
      return [{ type: 'MOVE_STAGE', targetStage: 'CLARIFICATION', reason: 'Clarification session created' }];

    case 'REQUIREMENTS_VERSION_CREATED':
      return [{ type: 'MOVE_STAGE', targetStage: 'REQUIREMENTS_REVIEW', reason: 'Requirements version created for review' }];

    case 'ASSUMPTIONS_ALL_APPROVED': {
      if (gateState.assumptions !== 'all_approved') {
        return [{ type: 'ADD_NOTE', note: `Cannot advance: assumptions not all approved (status: ${gateState.assumptions})`, reason: 'Assumptions gate not met' }];
      }
      return [{ type: 'ADD_NOTE', note: 'All assumptions approved — ready for proposal generation', reason: 'Assumptions approval milestone reached' }];
    }

    case 'PROPOSAL_MARKED_SENT': {
      if (gateState.proposal !== 'sent') {
        return [{ type: 'ADD_NOTE', note: `Cannot move to PROPOSAL_SENT: proposal status is ${gateState.proposal}, expected 'sent'`, reason: 'Proposal sent gate not met' }];
      }
      if (gateState.proposalReview !== 'approved') {
        return [{ type: 'ADD_NOTE', note: `Cannot move to PROPOSAL_SENT: proposal review is ${gateState.proposalReview}, expected 'approved'`, reason: 'Proposal review gate not met' }];
      }
      return [{ type: 'MOVE_STAGE', targetStage: 'PROPOSAL_SENT', reason: 'Proposal marked as sent after review approval' }];
    }

    case 'PROPOSAL_CLIENT_APPROVED': {
      if (gateState.proposal !== 'approved') {
        return [{ type: 'ADD_NOTE', note: `Cannot move to WON: proposal status is ${gateState.proposal}, expected 'approved'`, reason: 'Proposal approval gate not met' }];
      }
      return [{ type: 'MOVE_STAGE', targetStage: 'WON', reason: 'Client approved the proposal' }];
    }

    case 'NOT_A_FIT': {
      const note = gateState.fitDecision === 'not_a_fit'
        ? 'Marked as not a fit during review'
        : 'Not-a-fit event triggered';
      return [
        { type: 'MOVE_STAGE', targetStage: 'LOST', reason: 'Project determined to be not a fit' },
        { type: 'ADD_NOTE', note, reason: 'Not-a-fit decision recorded' },
      ];
    }

    default:
      return [{ type: 'ADD_NOTE', note: `Unknown event: ${triggeringEvent}`, reason: 'Unrecognized triggering event' }];
  }
}
