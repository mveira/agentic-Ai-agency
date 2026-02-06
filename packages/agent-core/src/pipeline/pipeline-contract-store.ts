import { z } from 'zod';
import type { PipelineActionContract } from './pipeline-router.js';

// ─── Pipeline Contract Status ────────────────────────────────────────────────

export const PipelineContractStatusSchema = z.enum(['PENDING', 'APPLIED', 'REJECTED']);
export type PipelineContractStatus = z.infer<typeof PipelineContractStatusSchema>;

// ─── Stored Contract Record ──────────────────────────────────────────────────

export const StoredPipelineContractSchema = z.object({
  contractId: z.string().uuid(),
  projectId: z.string(),
  targetStage: z.string(),
  actionType: z.literal('MOVE_STAGE'),
  humanReadableNote: z.string(),
  internalReason: z.object({
    eventType: z.string(),
    eventId: z.string(),
    relatedIds: z.record(z.string()).optional(),
  }),
  idempotencyKey: z.string(),
  status: PipelineContractStatusSchema,
  createdAt: z.string(),
});

export type StoredPipelineContract = z.infer<typeof StoredPipelineContractSchema>;

// ─── Pipeline Contract Store Interface ───────────────────────────────────────

export interface PipelineContractStore {
  insert(contract: PipelineActionContract): StoredPipelineContract;
  hasIdempotencyKey(key: string): boolean;
  findByProject(projectId: string): StoredPipelineContract[];
  updateStatus(contractId: string, status: PipelineContractStatus): void;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryPipelineContractStore implements PipelineContractStore {
  private records = new Map<string, StoredPipelineContract>();
  private idempotencyKeys = new Set<string>();

  insert(contract: PipelineActionContract): StoredPipelineContract {
    if (this.idempotencyKeys.has(contract.idempotencyKey)) {
      throw new Error(`Duplicate idempotency key: ${contract.idempotencyKey}`);
    }
    const stored: StoredPipelineContract = {
      ...structuredClone(contract),
      status: 'PENDING',
    };
    this.records.set(stored.contractId, stored);
    this.idempotencyKeys.add(contract.idempotencyKey);
    return structuredClone(stored);
  }

  hasIdempotencyKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }

  findByProject(projectId: string): StoredPipelineContract[] {
    return [...this.records.values()]
      .filter((r) => r.projectId === projectId)
      .map((r) => structuredClone(r));
  }

  updateStatus(contractId: string, status: PipelineContractStatus): void {
    const record = this.records.get(contractId);
    if (!record) return;
    record.status = status;
  }

  clear(): void {
    this.records.clear();
    this.idempotencyKeys.clear();
  }
}
