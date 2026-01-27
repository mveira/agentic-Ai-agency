/**
 * Knowledge Base MCP-Style Tools
 *
 * Read-only query tools for agents to access KB data.
 * Returns token-efficient minimal payloads: id, contentJson, createdAt only.
 */

import type { KnowledgeStore } from './knowledge-store.js';

// ─── Result Type ─────────────────────────────────────────────────────────────

export interface KBToolResultEntry {
  id: string;
  contentJson: Record<string, unknown>;
  createdAt: string;
}

export interface KBToolResult {
  entries: KBToolResultEntry[];
  count: number;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function toMinimalPayload(
  store: KnowledgeStore,
  projectId: string,
  type: 'requirement' | 'assumption' | 'decision' | 'design-rule' | 'review',
  status: 'approved' | 'rejected'
): KBToolResult {
  const entries = store.getByProjectTypeAndStatus(projectId, type, status);
  return {
    entries: entries.map((e) => ({
      id: e.id,
      contentJson: e.contentJson,
      createdAt: e.createdAt,
    })),
    count: entries.length,
  };
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export function getApprovedRequirements(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'requirement', 'approved');
}

export function getApprovedAssumptions(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'assumption', 'approved');
}

export function getDecisions(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'decision', 'approved');
}

export function getDesignRules(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'design-rule', 'approved');
}

export function getReviews(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'review', 'approved');
}

export function getRejectedAssumptions(store: KnowledgeStore, projectId: string): KBToolResult {
  return toMinimalPayload(store, projectId, 'assumption', 'rejected');
}

// ─── Registry ────────────────────────────────────────────────────────────────

export type KBToolFn = (store: KnowledgeStore, projectId: string) => KBToolResult;

export const KB_TOOL_REGISTRY: Record<string, KBToolFn> = {
  getApprovedRequirements,
  getApprovedAssumptions,
  getDecisions,
  getDesignRules,
  getReviews,
  getRejectedAssumptions,
};
