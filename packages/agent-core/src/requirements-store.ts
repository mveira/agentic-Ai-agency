/**
 * Requirements Version Store
 *
 * Stores immutable requirements versions per project.
 * Each version captures the full state of requirements + assumptions
 * at a point in time, with decisions applied.
 *
 * Also provides StoreBackedRequirementsProvider which bridges
 * the store to the RequirementsProvider interface used by BuildOrchestrator.
 */

import type { RequirementsVersion } from './requirements-schemas.js';
import type { RequirementsProvider } from './build-orchestrator.js';

// ─── Store Interface ─────────────────────────────────────────────────────────

export interface RequirementsVersionStore {
  store(version: RequirementsVersion): Promise<void>;
  get(projectId: string, versionId: string): Promise<RequirementsVersion | null>;
  getLatest(projectId: string): Promise<RequirementsVersion | null>;
  listVersions(projectId: string): Promise<RequirementsVersion[]>;
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

export class InMemoryRequirementsVersionStore implements RequirementsVersionStore {
  private versions: Map<string, RequirementsVersion> = new Map();

  async store(version: RequirementsVersion): Promise<void> {
    const key = `${version.projectId}:${version.versionId}`;
    this.versions.set(key, structuredClone(version));
  }

  async get(projectId: string, versionId: string): Promise<RequirementsVersion | null> {
    const key = `${projectId}:${versionId}`;
    const v = this.versions.get(key);
    return v ? structuredClone(v) : null;
  }

  async getLatest(projectId: string): Promise<RequirementsVersion | null> {
    const projectVersions = this.getProjectVersions(projectId);
    if (projectVersions.length === 0) return null;
    projectVersions.sort((a, b) => b.versionNumber - a.versionNumber);
    return structuredClone(projectVersions[0]!);
  }

  async listVersions(projectId: string): Promise<RequirementsVersion[]> {
    const projectVersions = this.getProjectVersions(projectId);
    projectVersions.sort((a, b) => a.versionNumber - b.versionNumber);
    return projectVersions.map((v) => structuredClone(v));
  }

  private getProjectVersions(projectId: string): RequirementsVersion[] {
    const result: RequirementsVersion[] = [];
    for (const v of this.versions.values()) {
      if (v.projectId === projectId) {
        result.push(v);
      }
    }
    return result;
  }

  /**
   * Clear all data (for tests).
   */
  clear(): void {
    this.versions.clear();
  }
}

// ─── Store-Backed Requirements Provider ──────────────────────────────────────

/**
 * Bridges RequirementsVersionStore to the RequirementsProvider interface
 * used by BuildOrchestrator for governance gate checks.
 */
export class StoreBackedRequirementsProvider implements RequirementsProvider {
  constructor(private store: RequirementsVersionStore) {}

  async getRequirements(
    projectId: string,
    versionId: string
  ): Promise<{
    exists: boolean;
    assumptionsApproved: boolean;
    data?: Record<string, unknown>;
  }> {
    const version = await this.store.get(projectId, versionId);

    if (!version) {
      return { exists: false, assumptionsApproved: false };
    }

    const allAssumptionsApproved =
      version.status === 'confirmed' &&
      version.assumptions.every((a) => a.status === 'approved');

    return {
      exists: true,
      assumptionsApproved: allAssumptionsApproved,
      data: {
        versionId: version.versionId,
        versionNumber: version.versionNumber,
        requirements: version.requirements,
        assumptions: version.assumptions,
      },
    };
  }
}
