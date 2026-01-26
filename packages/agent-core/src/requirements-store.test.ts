import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryRequirementsVersionStore,
  StoreBackedRequirementsProvider,
} from './requirements-store.js';
import type { RequirementsVersion } from './requirements-schemas.js';

function createTestVersion(overrides: Partial<RequirementsVersion> = {}): RequirementsVersion {
  return {
    versionId: 'v1',
    projectId: 'proj-1',
    versionNumber: 1,
    status: 'pending_confirmation',
    requirements: [
      {
        id: 'req-1',
        title: 'Landing page',
        details: 'With hero section',
        priority: 'MUST',
        confirmed: null,
      },
    ],
    assumptions: [
      {
        id: 'asn-1',
        statement: 'Minimal design',
        reason: 'From intake',
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

describe('InMemoryRequirementsVersionStore', () => {
  let store: InMemoryRequirementsVersionStore;

  beforeEach(() => {
    store = new InMemoryRequirementsVersionStore();
  });

  it('stores and retrieves a version', async () => {
    const version = createTestVersion();
    await store.store(version);

    const result = await store.get('proj-1', 'v1');
    expect(result).not.toBeNull();
    expect(result!.versionId).toBe('v1');
    expect(result!.projectId).toBe('proj-1');
  });

  it('returns null for unknown version', async () => {
    const result = await store.get('proj-1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null for unknown project', async () => {
    await store.store(createTestVersion());
    const result = await store.get('unknown-project', 'v1');
    expect(result).toBeNull();
  });

  it('getLatest returns the highest version number', async () => {
    await store.store(createTestVersion({ versionId: 'v1', versionNumber: 1 }));
    await store.store(createTestVersion({ versionId: 'v2', versionNumber: 2 }));
    await store.store(createTestVersion({ versionId: 'v3', versionNumber: 3 }));

    const latest = await store.getLatest('proj-1');
    expect(latest).not.toBeNull();
    expect(latest!.versionId).toBe('v3');
    expect(latest!.versionNumber).toBe(3);
  });

  it('getLatest returns null for unknown project', async () => {
    const result = await store.getLatest('unknown-project');
    expect(result).toBeNull();
  });

  it('listVersions returns all versions sorted by versionNumber ascending', async () => {
    await store.store(createTestVersion({ versionId: 'v3', versionNumber: 3 }));
    await store.store(createTestVersion({ versionId: 'v1', versionNumber: 1 }));
    await store.store(createTestVersion({ versionId: 'v2', versionNumber: 2 }));

    const versions = await store.listVersions('proj-1');
    expect(versions).toHaveLength(3);
    expect(versions[0]!.versionNumber).toBe(1);
    expect(versions[1]!.versionNumber).toBe(2);
    expect(versions[2]!.versionNumber).toBe(3);
  });

  it('listVersions returns empty array for unknown project', async () => {
    const result = await store.listVersions('unknown-project');
    expect(result).toEqual([]);
  });

  it('returns immutable copies (mutations do not affect stored data)', async () => {
    const version = createTestVersion();
    await store.store(version);

    const retrieved = await store.get('proj-1', 'v1');
    retrieved!.status = 'confirmed';
    retrieved!.requirements[0]!.confirmed = true;

    const fresh = await store.get('proj-1', 'v1');
    expect(fresh!.status).toBe('pending_confirmation');
    expect(fresh!.requirements[0]!.confirmed).toBeNull();
  });

  it('stores do not affect the original object', async () => {
    const version = createTestVersion();
    await store.store(version);

    version.status = 'confirmed';
    version.requirements[0]!.confirmed = true;

    const stored = await store.get('proj-1', 'v1');
    expect(stored!.status).toBe('pending_confirmation');
    expect(stored!.requirements[0]!.confirmed).toBeNull();
  });

  it('only returns versions for the requested project', async () => {
    await store.store(createTestVersion({ projectId: 'proj-1', versionId: 'v1' }));
    await store.store(createTestVersion({ projectId: 'proj-2', versionId: 'v1' }));

    const proj1Versions = await store.listVersions('proj-1');
    expect(proj1Versions).toHaveLength(1);
    expect(proj1Versions[0]!.projectId).toBe('proj-1');
  });

  it('clear removes all data', async () => {
    await store.store(createTestVersion());
    store.clear();

    const result = await store.get('proj-1', 'v1');
    expect(result).toBeNull();
  });
});

describe('StoreBackedRequirementsProvider', () => {
  let store: InMemoryRequirementsVersionStore;
  let provider: StoreBackedRequirementsProvider;

  beforeEach(() => {
    store = new InMemoryRequirementsVersionStore();
    provider = new StoreBackedRequirementsProvider(store);
  });

  it('returns exists: false for unknown version', async () => {
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.exists).toBe(false);
    expect(result.assumptionsApproved).toBe(false);
  });

  it('returns exists: true for stored version', async () => {
    await store.store(createTestVersion());
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.exists).toBe(true);
  });

  it('returns assumptionsApproved: false when status is pending_confirmation', async () => {
    await store.store(createTestVersion({ status: 'pending_confirmation' }));
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.assumptionsApproved).toBe(false);
  });

  it('returns assumptionsApproved: false when confirmed but assumptions not all approved', async () => {
    await store.store(
      createTestVersion({
        status: 'confirmed',
        assumptions: [
          { id: 'asn-1', statement: 'Test', reason: 'Test', status: 'approved' },
          { id: 'asn-2', statement: 'Test2', reason: 'Test2', status: 'rejected' },
        ],
      })
    );
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.assumptionsApproved).toBe(false);
  });

  it('returns assumptionsApproved: true when confirmed and all assumptions approved', async () => {
    await store.store(
      createTestVersion({
        status: 'confirmed',
        assumptions: [
          { id: 'asn-1', statement: 'Test', reason: 'Test', status: 'approved' },
          { id: 'asn-2', statement: 'Test2', reason: 'Test2', status: 'approved' },
        ],
      })
    );
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.assumptionsApproved).toBe(true);
  });

  it('includes version data when version exists', async () => {
    await store.store(createTestVersion());
    const result = await provider.getRequirements('proj-1', 'v1');
    expect(result.data).toBeDefined();
    expect(result.data!.versionId).toBe('v1');
    expect(result.data!.versionNumber).toBe(1);
  });
});
