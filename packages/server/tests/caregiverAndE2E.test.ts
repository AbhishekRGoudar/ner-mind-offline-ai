import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { AuthService } from '../src/auth/rbacMiddleware.js';
import { PatientRepository } from '../src/repository/patientRepository.js';
import { UserRepository } from '../src/auth/userRepository.js';
import { SyncBatchPayload, computeIdempotencyHash, CognitiveObservation, TransferEvaluation } from '@ner-mind/core';

describe('Phase 2.3 Server Caregiver Portal & End-to-End Flow: Tests 10–14', () => {
  let caregiver1Token: string;
  let caregiver2Token: string;
  let patientToken: string;

  beforeEach(async () => {
    UserRepository.seedInMemory();
    await PatientRepository.resetForTesting();
    AuthService.clearInMemoryForTesting();

    // Caregiver 1 (assigned to patient-ner-001)
    caregiver1Token = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });

    // Caregiver 2 (assigned to patient-ner-002)
    caregiver2Token = await AuthService.createSession({
      userId: 'caregiver-002',
      username: 'caregiver_anita',
      role: 'CAREGIVER',
      patientId: 'patient-ner-002',
    });

    // Patient 1
    patientToken = await AuthService.createSession({
      userId: 'user-pat-001',
      username: 'patient_bhaben',
      role: 'PATIENT',
      patientId: 'patient-ner-001',
    });
  });

  // 10. Caregiver assigned-patient filtering
  it('strictly filters patient list so Caregiver 1 sees only Patient 1 and Caregiver 2 sees only Patient 2', async () => {
    // Caregiver 1 request
    const res1 = await request(app)
      .get('/api/v1/caregiver/patients')
      .set('Authorization', `Bearer ${caregiver1Token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.patients).toBeDefined();
    expect(res1.body.patients.some((p: any) => p.id === 'patient-ner-001')).toBe(true);
    expect(res1.body.patients.some((p: any) => p.id === 'patient-ner-002')).toBe(false);

    // Caregiver 2 request
    const res2 = await request(app)
      .get('/api/v1/caregiver/patients')
      .set('Authorization', `Bearer ${caregiver2Token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.patients.some((p: any) => p.id === 'patient-ner-002')).toBe(true);
    expect(res2.body.patients.some((p: any) => p.id === 'patient-ner-001')).toBe(false);
  });

  // 11. Caregiver dashboard API integration
  it('provides comprehensive multidimensional cognitive profile, transfer history, and observations', async () => {
    // Seed sample observation
    const sampleObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: new Date().toISOString(),
      difficulty: 1,
      context: 'market',
      metrics: {
        rawScore: 0.8,
        itemsPresented: 5,
        itemsCorrect: 4,
        completionTimeMs: 12000,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };
    await PatientRepository.addObservation(sampleObs);

    // Seed sample transfer evaluation
    const sampleTransfer: TransferEvaluation = {
      patientId: 'patient-ner-001',
      domain: 'sequencing',
      baselineTaskId: 'morning_tea_sequence',
      verificationTaskId: 'morning_tea_sequence',
      baselineScore: 0.5,
      verificationScore: 0.8,
      transferDelta: 0.3,
      percentageChange: 60.0,
      trainingInterventionsCount: 2,
      contextsTraversed: ['kitchen', 'market'],
      confidenceScore: 0.75,
      transferCategory: 'positive_transfer',
      observedReport: 'Observed increase in selected task performance.',
      evaluatedAt: new Date().toISOString(),
    };
    await PatientRepository.addTransferEvaluation(sampleTransfer);

    // 1. Profile endpoint
    const profRes = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/profile')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    expect(profRes.status).toBe(200);
    expect(profRes.body.profile.domains.memory).toBeDefined();

    // 2. Transfer endpoint
    const transRes = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/transfer')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    expect(transRes.status).toBe(200);
    expect(transRes.body.transferEvaluations.length).toBe(1);
    expect(transRes.body.transferEvaluations[0].transferDelta).toBe(0.3);

    // 3. Observations endpoint
    const obsRes = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/observations')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    expect(obsRes.status).toBe(200);
    expect(obsRes.body.observations.length).toBe(1);
    expect(obsRes.body.observations[0].taskId).toBe('market_shopping_recall');
  });

  // 12. Alert generation from repeated observations
  it('generates alerts ONLY after repeated observed decline across sessions, not from a single poor game', async () => {
    const patientId = 'patient-ner-001';

    // Single poor observation (e.g. score 0.2)
    const singlePoorObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId,
      domain: 'sequencing',
      taskId: 'morning_tea_sequence',
      timestamp: '2026-09-20T08:00:00.000Z',
      difficulty: 2,
      context: 'kitchen',
      metrics: {
        rawScore: 0.2,
        itemsPresented: 5,
        itemsCorrect: 1,
        completionTimeMs: 25000,
        hesitationCount: 3,
        cueAssistanceCount: 2,
      },
    };
    await PatientRepository.addObservation(singlePoorObs);

    // Check alerts: Must NOT trigger on single poor session
    const alertRes1 = await request(app)
      .get('/api/v1/caregiver/alerts')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    expect(alertRes1.status).toBe(200);
    expect(alertRes1.body.alerts.length).toBe(0);

    // Add 2 more declining sessions to establish repeated pattern (total 3 sessions with progressive decline)
    const secondObs: CognitiveObservation = {
      ...singlePoorObs,
      id: crypto.randomUUID(),
      timestamp: '2026-09-21T08:00:00.000Z',
      metrics: { ...singlePoorObs.metrics, rawScore: 0.15 },
    };
    const thirdObs: CognitiveObservation = {
      ...singlePoorObs,
      id: crypto.randomUUID(),
      timestamp: '2026-09-22T08:00:00.000Z',
      metrics: { ...singlePoorObs.metrics, rawScore: 0.1 },
    };
    await PatientRepository.addObservation(secondObs);
    await PatientRepository.addObservation(thirdObs);

    // Check alerts: Now repeated decline pattern is confirmed across 3 sessions
    const alertRes2 = await request(app)
      .get('/api/v1/caregiver/alerts')
      .set('Authorization', `Bearer ${caregiver1Token}`);
    expect(alertRes2.status).toBe(200);
    expect(alertRes2.body.alerts.length).toBeGreaterThanOrEqual(1);

    const alert = alertRes2.body.alerts[0];
    expect(alert.domain).toBe('sequencing');
    expect(alert.observationWindow).toBe('3 sessions');
    expect(alert.reason).toContain('Repeated decrease observed in recent sequencing task performance');
    expect(alert.reviewStatus).toBe('PENDING_REVIEW');

    // Strict non-diagnostic safety verification
    const jsonStr = JSON.stringify(alert).toLowerCase();
    expect(jsonStr).not.toContain('dementia diagnosis');
    expect(jsonStr).not.toContain('progression rate');
    expect(jsonStr).not.toContain('cure');
  });

  // 13. Alert acknowledgement
  it('allows caregiver to mark alert as REVIEWED or ACKNOWLEDGED, and rejects medical diagnostic inputs', async () => {
    const alertId = 'alert-patient-ner-001-sequencing';

    // 1. Mark Reviewed
    const reviewRes = await request(app)
      .patch(`/api/v1/caregiver/alert/${alertId}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'REVIEWED' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('REVIEWED');

    // 2. Mark Acknowledged
    const ackRes = await request(app)
      .patch(`/api/v1/caregiver/alert/${alertId}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'ACKNOWLEDGED' });

    expect(ackRes.status).toBe(200);
    expect(ackRes.body.status).toBe('ACKNOWLEDGED');

    // 3. Prohibit medical diagnostic classification
    const badRes = await request(app)
      .patch(`/api/v1/caregiver/alert/${alertId}/status`)
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({ status: 'DEMENTIA_STAGE_2' });

    expect(badRes.status).toBe(400);
    expect(badRes.body.error).toBe('Bad Request');
    expect(badRes.body.message).toContain('Medical diagnosis classifications are prohibited');
  });

  // 14. End-to-end patient -> sync -> PostgreSQL -> caregiver flow
  it('executes full end-to-end flow: patient offline activity -> sync -> server persistence -> caregiver dashboard update', async () => {
    const patientId = 'patient-ner-001';
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 1. Patient plays activity offline and generates telemetry observation
    const completedObservation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId,
      domain: 'calculation',
      taskId: 'market_change_calculation',
      timestamp,
      difficulty: 2,
      context: 'market',
      metrics: {
        rawScore: 0.9,
        itemsPresented: 5,
        itemsCorrect: 5,
        completionTimeMs: 8500,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    // 2. Outbox event created on patient device
    const hash = computeIdempotencyHash(eventId, patientId, completedObservation as any, timestamp);
    const syncBatch: SyncBatchPayload = {
      batchId: crypto.randomUUID(),
      patientId,
      deviceTimestamp: timestamp,
      events: [
        {
          eventId,
          patientId,
          eventType: 'observation_recorded',
          payload: completedObservation as any,
          clientCreatedAt: timestamp,
          clientSequenceNumber: 1,
          idempotencyHash: hash,
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    // 3. Network restored: SyncWorker sends batch to /api/v1/sync
    const syncRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(syncBatch);

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.syncedEventIds).toContain(eventId);

    // 4. Caregiver logs in and retrieves updated patient observations and profile
    const caregiverObsRes = await request(app)
      .get(`/api/v1/caregiver/patient/${patientId}/observations`)
      .set('Authorization', `Bearer ${caregiver1Token}`);

    expect(caregiverObsRes.status).toBe(200);
    const foundObs = caregiverObsRes.body.observations.find((o: any) => o.taskId === 'market_change_calculation');
    expect(foundObs).toBeDefined();
    expect(foundObs.metrics.rawScore).toBe(0.9);

    const caregiverProfRes = await request(app)
      .get(`/api/v1/caregiver/patient/${patientId}/profile`)
      .set('Authorization', `Bearer ${caregiver1Token}`);

    expect(caregiverProfRes.status).toBe(200);
    expect(caregiverProfRes.body.profile.domains.calculation.observationCount).toBeGreaterThanOrEqual(1);
    expect(caregiverProfRes.body.profile.domains.calculation.currentScore).toBeGreaterThan(0.5);
  });
});
