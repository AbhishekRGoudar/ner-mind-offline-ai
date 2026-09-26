import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { AuthService } from '../src/auth/rbacMiddleware.js';
import { PatientRepository } from '../src/repository/patientRepository.js';

describe('Caregiver Portal Endpoints', () => {
  let caregiverToken: string;

  beforeAll(async () => {
    caregiverToken = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });
  });

  it('lists patients for authorized caregiver', async () => {
    const res = await request(app)
      .get('/api/v1/caregiver/patients')
      .set('Authorization', `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toBeDefined();
    expect(res.body.patients.length).toBeGreaterThan(0);
    expect(res.body.patients[0].id).toBe('patient-ner-001');
  });

  it('fetches patient multidimensional cognitive profile without clinical diagnostic words', async () => {
    const res = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/profile')
      .set('Authorization', `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.domains).toBeDefined();
    expect(res.body.profile.domains.memory).toBeDefined();
    expect(res.body.profile.domains.sequencing).toBeDefined();

    // Check non-diagnostic language compliance
    const jsonStr = JSON.stringify(res.body).toLowerCase();
    expect(jsonStr).not.toContain('dementia diagnosis');
    expect(jsonStr).not.toContain('progression rate');
    expect(jsonStr).not.toContain('cure');
  });

  it('records and returns real-life transfer history', async () => {
    await PatientRepository.addTransferEvaluation({
      patientId: 'patient-ner-001',
      domain: 'sequencing',
      baselineTaskId: 'morning_tea_sequence',
      verificationTaskId: 'morning_tea_sequence',
      baselineScore: 0.5,
      verificationScore: 0.8,
      transferDelta: 0.3,
      percentageChange: 60.0,
      trainingInterventionsCount: 3,
      contextsTraversed: ['kitchen', 'market', 'craft'],
      confidenceScore: 0.75,
      transferCategory: 'positive_transfer',
      observedReport: 'Observed positive transfer in selected real-life task performance (+30.0%).',
    });

    const res = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/transfer')
      .set('Authorization', `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transferEvaluations.length).toBeGreaterThan(0);
    expect(res.body.transferEvaluations[0].transferDelta).toBe(0.3);
  });
});
