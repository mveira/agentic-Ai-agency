import {
  type EventStore,
  type SystemEvent,
  markDone,
  markFailed,
  markDeadLetter,
} from './event-bus.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EventHandler = (event: SystemEvent) => Promise<void>;

export interface EventWorkerConfig {
  store: EventStore;
  handlers: Map<string, EventHandler>;
  workerId: string;
  batchSize: number;
  maxAttempts: number;
  baseBackoffMs: number;
}

export interface ProcessResult {
  eventId: string;
  eventType: string;
  status: 'success' | 'failed' | 'dead_lettered';
  error?: string;
  durationMs: number;
}

// ─── EventWorker ─────────────────────────────────────────────────────────────

export class EventWorker {
  private store: EventStore;
  private handlers: Map<string, EventHandler>;
  private workerId: string;
  private batchSize: number;
  private maxAttempts: number;
  private baseBackoffMs: number;

  constructor(config: EventWorkerConfig) {
    this.store = config.store;
    this.handlers = config.handlers;
    this.workerId = config.workerId;
    this.batchSize = config.batchSize;
    this.maxAttempts = config.maxAttempts;
    this.baseBackoffMs = config.baseBackoffMs;
  }

  /**
   * Process one batch of events.
   * Call this in a loop or on a timer for continuous processing.
   */
  async tick(): Promise<ProcessResult[]> {
    const batch = await this.store.fetchBatch(this.batchSize, this.workerId);
    const results: ProcessResult[] = [];

    for (const event of batch) {
      const start = Date.now();

      try {
        const handler = this.handlers.get(event.type);
        if (!handler) {
          throw new Error(`No handler registered for event type: ${event.type}`);
        }

        await handler(event);
        await markDone(this.store, event.id);

        results.push({
          eventId: event.id,
          eventType: event.type,
          status: 'success',
          durationMs: Date.now() - start,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const currentAttempts = event.attempts + 1;

        if (currentAttempts >= this.maxAttempts) {
          await markDeadLetter(this.store, event.id, errorMessage);
          results.push({
            eventId: event.id,
            eventType: event.type,
            status: 'dead_lettered',
            error: errorMessage,
            durationMs: Date.now() - start,
          });
        } else {
          const backoffMs = this.baseBackoffMs * Math.pow(2, currentAttempts - 1);
          await markFailed(this.store, event.id, errorMessage, backoffMs);
          results.push({
            eventId: event.id,
            eventType: event.type,
            status: 'failed',
            error: errorMessage,
            durationMs: Date.now() - start,
          });
        }
      }
    }

    return results;
  }
}

// ─── Default Handlers ────────────────────────────────────────────────────────

export function createDefaultHandlers(): Map<string, EventHandler> {
  const handlers = new Map<string, EventHandler>();

  // Stub handler — logs only, no business logic yet
  handlers.set('DISCOVERY_SUBMITTED', async (event) => {
    console.log(
      `[event-worker] DISCOVERY_SUBMITTED for project ${event.projectId}`,
      JSON.stringify(event.payloadJson)
    );
  });

  return handlers;
}
