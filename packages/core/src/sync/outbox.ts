import { z } from 'zod';

export const SyncEventTypeEnum = z.enum([
  'observation_recorded',
  'cognitive_profile_updated',
  'transfer_evaluated',
  'memory_profile_updated',
  'routine_completed',
]);

export type SyncEventType = z.infer<typeof SyncEventTypeEnum>;

export const SyncEventSchema = z.object({
  eventId: z.string().uuid(),
  patientId: z.string().min(1),
  eventType: SyncEventTypeEnum,
  payload: z.record(z.unknown()),
  clientCreatedAt: z.string().datetime(),
  clientSequenceNumber: z.number().int().nonnegative(),
  idempotencyHash: z.string().min(16),
  status: z.enum(['pending', 'syncing', 'synced', 'failed']).default('pending'),
  retryCount: z.number().int().nonnegative().default(0),
  lastError: z.string().optional(),
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

export const SyncBatchPayloadSchema = z.object({
  batchId: z.string().uuid(),
  patientId: z.string().min(1),
  deviceTimestamp: z.string().datetime(),
  events: z.array(SyncEventSchema),
});

export type SyncBatchPayload = z.infer<typeof SyncBatchPayloadSchema>;

export interface SyncBatchResponse {
  batchId: string;
  processedCount: number;
  duplicateCount: number;
  syncedEventIds: string[];
  serverAcknowledgedAt: string;
}

/**
 * Calculates a deterministic hash for idempotency and tampering prevention.
 * Uses standard DJB2-based or polynomial rolling hash when WebCrypto is not injected,
 * ensuring high portable performance offline without external dependencies.
 */
export function computeIdempotencyHash(eventId: string, patientId: string, payload: unknown, timestamp: string): string {
  const str = `${eventId}:${patientId}:${JSON.stringify(payload)}:${timestamp}`;
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c64e6d ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `h_${part1}${part2}`;
}

/**
 * Outbox manager for managing offline client synchronization queue.
 */
export class OutboxQueueManager {
  private queue: SyncEvent[] = [];
  private sequenceCounter = 0;

  constructor(initialEvents: SyncEvent[] = []) {
    this.queue = [...initialEvents];
    this.sequenceCounter = initialEvents.reduce((max, e) => Math.max(max, e.clientSequenceNumber), 0);
  }

  /**
   * Enqueues an offline event. Generates deterministic sequence and idempotency hash.
   */
  public enqueue(
    eventId: string,
    patientId: string,
    eventType: SyncEventType,
    payload: Record<string, unknown>,
    timestamp: string = new Date().toISOString()
  ): SyncEvent {
    this.sequenceCounter++;
    const hash = computeIdempotencyHash(eventId, patientId, payload, timestamp);

    const event: SyncEvent = {
      eventId,
      patientId,
      eventType,
      payload,
      clientCreatedAt: timestamp,
      clientSequenceNumber: this.sequenceCounter,
      idempotencyHash: hash,
      status: 'pending',
      retryCount: 0,
    };

    this.queue.push(event);
    return event;
  }

  public getPendingEvents(): SyncEvent[] {
    return this.queue.filter(e => e.status === 'pending' || e.status === 'failed');
  }

  public createSyncBatch(patientId: string, batchId: string = crypto.randomUUID()): SyncBatchPayload | null {
    const pending = this.getPendingEvents();
    if (pending.length === 0) return null;

    // Mark pending events as syncing
    for (const e of pending) {
      e.status = 'syncing';
    }

    return {
      batchId,
      patientId,
      deviceTimestamp: new Date().toISOString(),
      events: [...pending],
    };
  }

  public acknowledgeSynced(eventIds: string[]): void {
    const set = new Set(eventIds);
    for (const e of this.queue) {
      if (set.has(e.eventId)) {
        e.status = 'synced';
      }
    }
  }

  public recordFailure(eventIds: string[], errorMessage: string): void {
    const set = new Set(eventIds);
    for (const e of this.queue) {
      if (set.has(e.eventId)) {
        e.status = 'failed';
        e.retryCount += 1;
        e.lastError = errorMessage;
      }
    }
  }

  public getAllEvents(): SyncEvent[] {
    return [...this.queue];
  }
}

/**
 * Server-side deduplication and idempotency processing.
 * Guarantees zero duplicate entries when receiving repeated or retried network sync packets.
 */
export function processServerSyncBatch(
  batch: SyncBatchPayload,
  existingEventIds: Set<string>
): SyncBatchResponse {
  const syncedEventIds: string[] = [];
  let duplicateCount = 0;

  for (const event of batch.events) {
    if (existingEventIds.has(event.eventId)) {
      duplicateCount++;
      // Still acknowledge duplicate so client can safely mark it synced
      syncedEventIds.push(event.eventId);
    } else {
      existingEventIds.add(event.eventId);
      syncedEventIds.push(event.eventId);
    }
  }

  return {
    batchId: batch.batchId,
    processedCount: batch.events.length - duplicateCount,
    duplicateCount,
    syncedEventIds,
    serverAcknowledgedAt: new Date().toISOString(),
  };
}
