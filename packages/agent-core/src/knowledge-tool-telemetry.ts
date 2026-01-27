/**
 * Knowledge Tool Telemetry
 *
 * Logs KB tool usage via the existing recordTaskRun telemetry.
 * Uses taskType `kb-tool:<toolName>` with model 'none' and 0 tokens.
 */

import { recordTaskRun } from '@agency/telemetry';
import type { TelemetryStore } from '@agency/telemetry';

export interface LogToolUsageParams {
  projectId: string;
  agentId: string;
  toolName: string;
  resultCount: number;
  store?: TelemetryStore;
}

export async function logToolUsage(params: LogToolUsageParams): Promise<void> {
  await recordTaskRun({
    projectId: params.projectId,
    agentId: params.agentId,
    taskType: `kb-tool:${params.toolName}`,
    model: 'mock',
    promptHash: 'n/a',
    inputTokens: 0,
    outputTokens: 0,
    status: 'completed',
    metadata: {
      toolName: params.toolName,
      resultCount: params.resultCount,
    },
    store: params.store,
  });
}
