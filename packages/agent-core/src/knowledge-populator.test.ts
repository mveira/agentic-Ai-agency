import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryKnowledgeStore } from './knowledge-store.js';
import { populateKBFromConfirmation } from './knowledge-populator.js';
import type { RequirementsVersion } from './requirements-schemas.js';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createConfirmedVersion(overrides: Partial<RequirementsVersion> = {}): RequirementsVersion {
  return {
    versionId: 'v1',
    projectId: PROJECT_ID,
    versionNumber: 1,
    status: 'confirmed',
    requirements: [
      {
        id: 'req-1',
        title: 'Landing page',
        details: 'With hero section',
        priority: 'MUST',
        confirmed: true,
      },
    ],
    assumptions: [
      {
        id: 'asn-1',
        statement: 'Minimal design',
        reason: 'From intake',
        status: 'approved',
      },
      {
        id: 'asn-2',
        statement: 'Budget is flexible',
        reason: 'Assumed',
        status: 'rejected',
        comment: 'Not accurate',
      },
      {
        id: 'asn-3',
        statement: 'Timeline flexible',
        reason: 'Assumed',
        status: 'pending',
      },
    ],
    factsSnapshot: {
      summary: ['Target audience: SaaS founders'],
      structuredAnswers: [{ key: 'budget', value: 3000 }],
    },
    changeRequests: [],
    createdAt: '2026-01-26T10:00:00Z',
    ...overrides,
  };
}

describe('populateKBFromConfirmation', () => {
  let store: InMemoryKnowledgeStore;

  beforeEach(() => {
    store = new InMemoryKnowledgeStore();
  });

  it('skips non-confirmed versions', () => {
    const version = createConfirmedVersion({ status: 'pending_confirmation' });
    const result = populateKBFromConfirmation(store, version);

    expect(result.entriesCreated).toBe(0);
    expect(store.getByProject(PROJECT_ID)).toHaveLength(0);
  });

  it('populates requirement entries', () => {
    const version = createConfirmedVersion();
    const result = populateKBFromConfirmation(store, version);

    expect(result.requirementEntries).toBe(1);
    const reqs = store.getByProjectTypeAndStatus(PROJECT_ID, 'requirement', 'approved');
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.contentJson.title).toBe('Landing page');
  });

  it('populates approved assumptions', () => {
    const version = createConfirmedVersion();
    const result = populateKBFromConfirmation(store, version);

    expect(result.approvedAssumptionEntries).toBe(1);
    const approved = store.getByProjectTypeAndStatus(PROJECT_ID, 'assumption', 'approved');
    expect(approved).toHaveLength(1);
    expect(approved[0]!.contentJson.statement).toBe('Minimal design');
  });

  it('populates rejected assumptions as audit trail', () => {
    const version = createConfirmedVersion();
    const result = populateKBFromConfirmation(store, version);

    expect(result.rejectedAssumptionEntries).toBe(1);
    const rejected = store.getByProjectTypeAndStatus(PROJECT_ID, 'assumption', 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.contentJson.statement).toBe('Budget is flexible');
  });

  it('skips pending assumptions', () => {
    const version = createConfirmedVersion();
    const result = populateKBFromConfirmation(store, version);

    // 1 req + 1 approved assumption + 1 rejected assumption = 3
    expect(result.entriesCreated).toBe(3);
  });

  it('contentJson contains full requirement data', () => {
    const version = createConfirmedVersion();
    populateKBFromConfirmation(store, version);

    const reqs = store.getByProjectTypeAndStatus(PROJECT_ID, 'requirement', 'approved');
    expect(reqs[0]!.contentJson).toEqual({
      id: 'req-1',
      title: 'Landing page',
      details: 'With hero section',
      priority: 'MUST',
      confirmed: true,
    });
  });

  it('sets versionRef to version.versionId', () => {
    const version = createConfirmedVersion({ versionId: 'v3' });
    populateKBFromConfirmation(store, version);

    const entries = store.getByProject(PROJECT_ID);
    entries.forEach((e) => expect(e.versionRef).toBe('v3'));
  });

  it('supersedes prior entries for same project', () => {
    // Populate v1
    const v1 = createConfirmedVersion({ versionId: 'v1' });
    populateKBFromConfirmation(store, v1);

    const v1Entries = store.getByProject(PROJECT_ID);
    expect(v1Entries.length).toBeGreaterThan(0);
    const v1EntryId = v1Entries[0]!.id;

    // Populate v2
    const v2 = createConfirmedVersion({ versionId: 'v2', versionNumber: 2 });
    populateKBFromConfirmation(store, v2);

    // v1 entries should be superseded
    const supersededEntry = store.get(v1EntryId);
    expect(supersededEntry!.status).toBe('superseded');

    // v2 entries should be approved
    const approved = store.getByProjectTypeAndStatus(PROJECT_ID, 'requirement', 'approved');
    expect(approved).toHaveLength(1);
    expect(approved[0]!.versionRef).toBe('v2');
  });
});
