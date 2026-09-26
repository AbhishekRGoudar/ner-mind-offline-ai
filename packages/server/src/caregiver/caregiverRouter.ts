import { Router, Response } from 'express';
import {
  calculateCognitiveProfile,
  assertNonDiagnosticCopy,
} from '@ner-mind/core';
import { PatientRepository } from '../repository/patientRepository.js';
import { AuthenticatedRequest, requirePatientAccess } from '../auth/rbacMiddleware.js';

export const caregiverRouter = Router();

/**
 * GET /api/v1/caregiver/patients
 * List monitored patients.
 * If user is CAREGIVER, filtered strictly to assigned patients.
 */
caregiverRouter.get('/patients', async (req: AuthenticatedRequest, res: Response) => {
  const allPatients = await PatientRepository.getAllPatients();
  const user = req.user!;

  // Server-side authorization filter: caregivers only see their assigned patients
  const authorizedPatients = user.role === 'CAREGIVER'
    ? allPatients.filter(p => p.caregiverId === user.userId)
    : allPatients;

  const summary = await Promise.all(authorizedPatients.map(async p => {
    const obs = await PatientRepository.getObservations(p.id);
    const profile = calculateCognitiveProfile(p.id, obs);
    return {
      id: p.id,
      displayName: p.displayName,
      lastSyncedAt: p.lastSyncedAt,
      totalObservations: obs.length,
      reviewRecommended: profile.reviewRecommended,
      preferredLanguage: p.profile.preferredLanguage,
    };
  }));

  return res.json({ patients: summary });
});

/**
 * GET /api/v1/caregiver/patient/:id/profile
 * Returns multidimensional cognitive profile for a patient.
 * Protected against IDOR via requirePatientAccess.
 */
caregiverRouter.get(
  '/patient/:id/profile',
  requirePatientAccess(req => req.params.id),
  async (req: AuthenticatedRequest, res: Response) => {
    const patientId = req.params.id;
    const patient = await PatientRepository.getPatient(patientId);

    if (!patient) {
      return res.status(404).json({ error: 'Not Found', message: `Patient '${patientId}' not found.` });
    }

    const observations = await PatientRepository.getObservations(patientId);
    const profile = calculateCognitiveProfile(patientId, observations);

    // Validate non-diagnostic safety
    assertNonDiagnosticCopy(profile.observedSummary);
    if (profile.reviewReason) {
      assertNonDiagnosticCopy(profile.reviewReason);
    }

    return res.json({ patient, profile });
  }
);

/**
 * GET /api/v1/caregiver/patient/:id/transfer
 * Returns real-life transfer history and delta analysis.
 * Protected against IDOR via requirePatientAccess.
 */
caregiverRouter.get(
  '/patient/:id/transfer',
  requirePatientAccess(req => req.params.id),
  async (req: AuthenticatedRequest, res: Response) => {
    const patientId = req.params.id;
    const evaluations = await PatientRepository.getTransferEvaluations(patientId);
    return res.json({ patientId, transferEvaluations: evaluations });
  }
);

/**
 * GET /api/v1/caregiver/patient/:id/observations
 * Returns raw cognitive training history (completed activities, domain, difficulty, completion time, score, cues).
 * Protected against IDOR via requirePatientAccess.
 */
caregiverRouter.get(
  '/patient/:id/observations',
  requirePatientAccess(req => req.params.id),
  async (req: AuthenticatedRequest, res: Response) => {
    const patientId = req.params.id;
    const observations = await PatientRepository.getObservations(patientId);
    return res.json({ patientId, observations });
  }
);

/**
 * GET /api/v1/caregiver/alerts
 * Returns non-diagnostic alerts for patients showing repeated performance decline.
 * Requires repeated observations (not single poor game). Filtered by caregiver ownership.
 */
caregiverRouter.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  const allPatients = await PatientRepository.getAllPatients();
  const user = req.user!;

  const authorizedPatients = user.role === 'CAREGIVER'
    ? allPatients.filter(p => p.caregiverId === user.userId)
    : allPatients;

  const alerts: Array<{
    id: string;
    patientId: string;
    patientName: string;
    domain: string;
    observationWindow: string;
    reason: string;
    timestamp: string;
    reviewStatus: string;
  }> = [];

  for (const p of authorizedPatients) {
    const obs = await PatientRepository.getObservations(p.id);
    const profile = calculateCognitiveProfile(p.id, obs);

    // Group observations by domain to inspect repeated trends
    const domainGroups = new Map<string, typeof obs>();
    for (const o of obs) {
      const list = domainGroups.get(o.domain) || [];
      list.push(o);
      domainGroups.set(o.domain, list);
    }

    for (const [domain, domainObs] of domainGroups.entries()) {
      // Require at least 3 repeated observations in the domain
      if (domainObs.length >= 3) {
        const domainMetric = profile.domains[domain as keyof typeof profile.domains];
        const isDecline = domainMetric && domainMetric.trend === 'declining';
        
        // Also check if last 3 observations show progressive decrease
        const last3 = domainObs.slice(-3);
        const consecutiveDecrease = last3[2].metrics.rawScore < last3[1].metrics.rawScore &&
                                    last3[1].metrics.rawScore < last3[0].metrics.rawScore;

        if (isDecline || consecutiveDecrease) {
          const reason = `Repeated decrease observed in recent ${domain} task performance. Consider reviewing the patient's recent activity with the health worker.`;
          assertNonDiagnosticCopy(reason);

          const alertId = `alert-${p.id}-${domain}`;
          const reviewStatus = await PatientRepository.getAlertStatus(alertId);

          alerts.push({
            id: alertId,
            patientId: p.id,
            patientName: p.displayName,
            domain,
            observationWindow: `${domainObs.length} sessions`,
            reason,
            timestamp: domainObs[domainObs.length - 1].timestamp,
            reviewStatus,
          });
        }
      }
    }
  }

  return res.json({ alerts });
});

/**
 * PATCH /api/v1/caregiver/alert/:id/status
 * Acknowledges or marks an alert as reviewed.
 * Strictly disallows medical diagnosis classifications.
 */
caregiverRouter.patch(
  '/alert/:id/status',
  async (req: AuthenticatedRequest, res: Response) => {
    const alertId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ['REVIEWED', 'ACKNOWLEDGED'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid review status. Allowed values: ${allowedStatuses.join(', ')}. Medical diagnosis classifications are prohibited.`,
      });
    }

    await PatientRepository.setAlertStatus(alertId, status as any, req.user!.username);
    return res.json({ alertId, status, updatedBy: req.user!.username });
  }
);
