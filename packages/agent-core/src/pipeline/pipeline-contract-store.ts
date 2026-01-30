import { z } from 'zod';

// ─── CRM Action Contract Record ─────────────────────────────────────────────

export const CRMContractStatusSchema = z.enum(['PENDING', 'APPLIED', 'FAILED']);
export type CRMContractStatus = z.infer<typeof CRMContractStatusSchema>;

export const CRMActionContractRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  contactId: z.string(),
  actionType: z.enum(['MOVE_STAGE', 'TRIGGER_WORKFLOW', 'ADD_NOTE']),
  payload: z.record(z.unknown()),
  status: CRMContractStatusSchema,
  reason: z.string(),
  createdAt: z.string(),
});

export type CRMActionContractRecord = z.infer<typeof CRMActionContractRecordSchema>;

// ─── CRM Contract Store Interface ───────────────────────────────────────────

export interface CRMContractStore {
  insert(record: CRMActionContractRecord): void;
  findByProject(projectId: string): CRMActionContractRecord[];
  updateStatus(id: string, status: CRMContractStatus, failureReason?: string): void;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryCRMContractStore implements CRMContractStore {
  private records = new Map<string, CRMActionContractRecord>();

  insert(record: CRMActionContractRecord): void {
    this.records.set(record.id, structuredClone(record));
  }

  findByProject(projectId: string): CRMActionContractRecord[] {
    return [...this.records.values()]
      .filter((r) => r.projectId === projectId)
      .map((r) => structuredClone(r));
  }

  updateStatus(id: string, status: CRMContractStatus, _failureReason?: string): void {
    const record = this.records.get(id);
    if (!record) return;
    record.status = status;
  }

  clear(): void {
    this.records.clear();
  }
}
