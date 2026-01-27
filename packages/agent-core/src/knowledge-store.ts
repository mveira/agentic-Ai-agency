/**
 * Knowledge Store
 *
 * Stores knowledge base entries per project.
 * Each entry is immutable once stored — supersede rather than mutate.
 */

import type { KnowledgeEntry, KnowledgeEntryType, KnowledgeEntryStatus } from './knowledge-schemas.js';

// ─── Store Interface ─────────────────────────────────────────────────────────

export interface KnowledgeStore {
  store(entry: KnowledgeEntry): void;
  get(id: string): KnowledgeEntry | null;
  getByProject(projectId: string): KnowledgeEntry[];
  getByProjectAndType(projectId: string, type: KnowledgeEntryType): KnowledgeEntry[];
  getByProjectTypeAndStatus(
    projectId: string,
    type: KnowledgeEntryType,
    status: KnowledgeEntryStatus
  ): KnowledgeEntry[];
  supersede(id: string): void;
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

export class InMemoryKnowledgeStore implements KnowledgeStore {
  private entries: Map<string, KnowledgeEntry> = new Map();

  store(entry: KnowledgeEntry): void {
    this.entries.set(entry.id, structuredClone(entry));
  }

  get(id: string): KnowledgeEntry | null {
    const entry = this.entries.get(id);
    return entry ? structuredClone(entry) : null;
  }

  getByProject(projectId: string): KnowledgeEntry[] {
    const result: KnowledgeEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.projectId === projectId) {
        result.push(structuredClone(entry));
      }
    }
    return result;
  }

  getByProjectAndType(projectId: string, type: KnowledgeEntryType): KnowledgeEntry[] {
    const result: KnowledgeEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.projectId === projectId && entry.type === type) {
        result.push(structuredClone(entry));
      }
    }
    return result;
  }

  getByProjectTypeAndStatus(
    projectId: string,
    type: KnowledgeEntryType,
    status: KnowledgeEntryStatus
  ): KnowledgeEntry[] {
    const result: KnowledgeEntry[] = [];
    for (const entry of this.entries.values()) {
      if (
        entry.projectId === projectId &&
        entry.type === type &&
        entry.status === status
      ) {
        result.push(structuredClone(entry));
      }
    }
    return result;
  }

  supersede(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.status = 'superseded';
    }
  }

  /**
   * Clear all data (for tests).
   */
  clear(): void {
    this.entries.clear();
  }
}
