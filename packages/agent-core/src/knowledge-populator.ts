/**
 * Knowledge Base Populator
 *
 * Populates KB entries from confirmed requirements versions.
 * Only confirmed versions generate entries. Supersedes prior
 * entries for the same project when a new version is confirmed.
 */

import { randomUUID } from 'node:crypto';
import type { KnowledgeStore } from './knowledge-store.js';
import type { KnowledgeEntry } from './knowledge-schemas.js';
import type { RequirementsVersion } from './requirements-schemas.js';

// ─── Result Type ─────────────────────────────────────────────────────────────

export interface PopulateKBResult {
  entriesCreated: number;
  requirementEntries: number;
  approvedAssumptionEntries: number;
  rejectedAssumptionEntries: number;
}

// ─── Populator ───────────────────────────────────────────────────────────────

export function populateKBFromConfirmation(
  store: KnowledgeStore,
  version: RequirementsVersion
): PopulateKBResult {
  // Only populate from confirmed versions
  if (version.status !== 'confirmed') {
    return {
      entriesCreated: 0,
      requirementEntries: 0,
      approvedAssumptionEntries: 0,
      rejectedAssumptionEntries: 0,
    };
  }

  // Supersede prior entries for this project with a different versionRef
  const existingEntries = store.getByProject(version.projectId);
  for (const entry of existingEntries) {
    if (entry.versionRef !== version.versionId && entry.status !== 'superseded') {
      store.supersede(entry.id);
    }
  }

  const now = new Date().toISOString();
  let requirementEntries = 0;
  let approvedAssumptionEntries = 0;
  let rejectedAssumptionEntries = 0;

  // Requirements → type 'requirement', status 'approved'
  for (const req of version.requirements) {
    const entry: KnowledgeEntry = {
      id: randomUUID(),
      projectId: version.projectId,
      type: 'requirement',
      source: 'agent',
      versionRef: version.versionId,
      contentJson: { ...req },
      status: 'approved',
      createdAt: now,
    };
    store.store(entry);
    requirementEntries++;
  }

  // Assumptions
  for (const asn of version.assumptions) {
    if (asn.status === 'approved') {
      const entry: KnowledgeEntry = {
        id: randomUUID(),
        projectId: version.projectId,
        type: 'assumption',
        source: 'agent',
        versionRef: version.versionId,
        contentJson: { ...asn },
        status: 'approved',
        createdAt: now,
      };
      store.store(entry);
      approvedAssumptionEntries++;
    } else if (asn.status === 'rejected') {
      const entry: KnowledgeEntry = {
        id: randomUUID(),
        projectId: version.projectId,
        type: 'assumption',
        source: 'agent',
        versionRef: version.versionId,
        contentJson: { ...asn },
        status: 'rejected',
        createdAt: now,
      };
      store.store(entry);
      rejectedAssumptionEntries++;
    }
    // Pending assumptions are skipped
  }

  const entriesCreated = requirementEntries + approvedAssumptionEntries + rejectedAssumptionEntries;

  return {
    entriesCreated,
    requirementEntries,
    approvedAssumptionEntries,
    rejectedAssumptionEntries,
  };
}
