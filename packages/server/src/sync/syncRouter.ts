import { Router, Response } from 'express';
import {
  SyncBatchPayloadSchema,
  processServerSyncBatch,
  CognitiveObservationSchema,
} from '@ner-mind/core';
import { PatientRepository } from '../repository/patientRepository.js';
import { AuditLogger } from '../security/auditLogger.js';
import { AuthenticatedRequest, requireRole } from '../auth/rbacMiddleware.js';

export const syncRouter = Router();

/**
 * POST /api/v1/sync
 * Authenticated & authorized sync endpoint for offline outbox batches.
 * Validates authenticated identity, patient ownership, payload schema, and monotonic sequence numbers.
 */
syncRouter.post(
  '/',
  requireRole(['PATIENT', 'CAREGIVER', 'HEALTH_WORKER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parseResult = SyncBatchPayloadSchema.safeParse(req.body);

    if (!parseResult.success) {
      AuditLogger.log({
        eventType: 'SECURITY_VIOLATION',
        actorId: user.userId,
        ipAddress: req.ip || 'unknown',
        outcome: 'FAILURE',
        metadata: { reason: 'Malformed sync payload', errors: parseResult.error.format() },
      });

      return res.status(400).json({
        error: 'Invalid Payload',
        details: parseResult.error.errors,
      });
    }

    const batch = parseResult.data;

    // 1. Authorize Patient Ownership / Permitted Identity
    if (user.role === 'PATIENT') {
      if (user.patientId && user.patientId !== batch.patientId) {
        AuditLogger.log({
          eventType: 'SECURITY_VIOLATION',
          actorId: user.userId,
          ipAddress: req.ip || 'unknown',
          outcome: 'FAILURE',
          metadata: { reason: 'Patient identity mismatch on sync batch', attempted: batch.patientId },
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You cannot submit observations for another patient.',
        });
      }
    } else if (user.role === 'CAREGIVER') {
      const patient = await PatientRepository.getPatient(batch.patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Not Found', message: `Patient '${batch.patientId}' not found.` });
      }
      if (patient.caregiverId !== user.userId) {
        AuditLogger.log({
          eventType: 'SECURITY_VIOLATION',
          actorId: user.userId,
          ipAddress: req.ip || 'unknown',
          outcome: 'FAILURE',
          metadata: { reason: 'Caregiver attempted sync for unassigned patient', attempted: batch.patientId },
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You are not the assigned caregiver for this patient.',
        });
      }
    }

    // 2. Validate Event Ownership: All events must belong to the permitted patient
    for (const event of batch.events) {
      if (event.patientId !== batch.patientId) {
        AuditLogger.log({
          eventType: 'SECURITY_VIOLATION',
          actorId: user.userId,
          ipAddress: req.ip || 'unknown',
          outcome: 'FAILURE',
          metadata: { reason: 'Event patientId does not match batch patientId', eventId: event.eventId },
        });
        return res.status(400).json({
          error: 'Bad Request',
          message: `Event '${event.eventId}' patientId (${event.patientId}) does not match batch patientId (${batch.patientId}).`,
        });
      }
    }

    const processedEventIds = PatientRepository.getProcessedEventIds();

    // Identify newly received events before updating processedEventIds set
    const newEvents = batch.events.filter(e => !processedEventIds.has(e.eventId));

    // Deduplicate and acknowledge using core algorithm
    const syncResult = processServerSyncBatch(batch, processedEventIds);

    // Replay only newly processed events into repository
    for (const event of newEvents) {
      if (event.eventType === 'observation_recorded') {
        const obsParse = CognitiveObservationSchema.safeParse(event.payload);
        if (obsParse.success) {
          await PatientRepository.addObservation(obsParse.data);
        }
      } else if (event.eventType === 'transfer_evaluated') {
        await PatientRepository.addTransferEvaluation(event.payload as any);
      }
    }

    await PatientRepository.updateLastSync(batch.patientId, new Date().toISOString());

    AuditLogger.log({
      eventType: 'SYNC_BATCH',
      actorId: user.userId,
      ipAddress: req.ip || 'unknown',
      outcome: 'SUCCESS',
      metadata: {
        batchId: batch.batchId,
        patientId: batch.patientId,
        processed: syncResult.processedCount,
        duplicates: syncResult.duplicateCount,
      },
    });

    return res.status(200).json(syncResult);
  }
);
