import { describe, it, expect, beforeEach } from 'vitest';
import { seedDemoScenario, DEMO_PATIENT_ID, DEMO_NOTICE } from '../src/demo/demoSeeder';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage';

describe('Phase 4 — SIH Demo Seeder & Closed-Loop Simulation', () => {
  beforeEach(async () => {
    await IndexedDbStorageService.resetForTesting();
  });

  it('seeds 7-day realistic trajectory, computes transfer delta, and verifies non-diagnostic compliance', async () => {
    const seedResult = await seedDemoScenario();

    expect(seedResult.observationsCount).toBe(7);
    expect(seedResult.transferEvaluationsCount).toBe(1);
    expect(seedResult.transferDelta).toBeGreaterThan(0); // Observed improvement
    expect(Number(seedResult.transferDelta.toFixed(2))).toBe(0.23);

    // Verify stored observations in IndexedDB
    const observations = IndexedDbStorageService.getObservations();
    expect(observations.length).toBe(7);
    expect(observations.every(o => o.patientId === DEMO_PATIENT_ID)).toBe(true);

    // Verify domains covered
    const domains = new Set(observations.map(o => o.domain));
    expect(domains.has('sequencing')).toBe(true);
    expect(domains.has('attention')).toBe(true);
    expect(domains.has('memory')).toBe(true);
    expect(domains.has('planning')).toBe(true);
    expect(domains.has('calculation')).toBe(true);

    // Verify transfer evaluation record
    const transfers = IndexedDbStorageService.getTransferHistory();
    expect(transfers.length).toBe(1);
    expect(transfers[0].baselineTaskId).toBe('morning_tea_sequence');
    expect(transfers[0].verificationTaskId).toBe('morning_tea_sequence');
    expect(transfers[0].baselineScore).toBe(0.65);
    expect(transfers[0].verificationScore).toBe(0.88);
    expect(transfers[0].transferDelta).toBe(0.23);
    expect(transfers[0].transferCategory).toBe('positive_transfer');

    // Verify demo notice safety constraint
    expect(DEMO_NOTICE).toContain('DEMO/SYNTHETIC DATA ONLY');
    expect(DEMO_NOTICE).toContain('NOT A CLINICAL DIAGNOSIS');
  });
});
