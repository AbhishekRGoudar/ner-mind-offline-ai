import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabasePool } from './dbPool.js';
import { PasswordService } from '../auth/passwordService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runDatabaseMigrations(): Promise<void> {
  if (!DatabasePool.isAvailable()) {
    console.log('[Migration] Database pool not available, skipping PostgreSQL migration.');
    return;
  }

  console.log('[Migration] Running PostgreSQL schema migrations...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await DatabasePool.query(schemaSql);
  console.log('[Migration] Schema tables and indexes verified.');

  // Seed default users if users table is empty
  const usersRes = await DatabasePool.query('SELECT COUNT(*) FROM users');
  if (parseInt(usersRes.rows[0].count, 10) === 0) {
    console.log('[Migration] Seeding initial staff accounts with Scrypt password hashes...');

    const caregiverPassHash = await PasswordService.hashPassword('CaregiverSecurePass123!');
    const caregiver2PassHash = await PasswordService.hashPassword('Caregiver2SecurePass123!');
    const hwPassHash = await PasswordService.hashPassword('HealthWorkerPass123!');
    const adminPassHash = await PasswordService.hashPassword('AdminSecurePass123!');
    const patientPassHash = await PasswordService.hashPassword('PatientSecurePass123!');

    // 1. Caregiver 1
    const cg1 = await DatabasePool.query(
      `INSERT INTO users (id, username, password_hash, role)
       VALUES ('11111111-1111-1111-1111-111111111111', 'caregiver_pranjal', $1, 'CAREGIVER')
       RETURNING id`,
      [caregiverPassHash]
    );

    // 2. Caregiver 2 (for IDOR testing)
    const cg2 = await DatabasePool.query(
      `INSERT INTO users (id, username, password_hash, role)
       VALUES ('22222222-2222-2222-2222-222222222222', 'caregiver_anita', $1, 'CAREGIVER')
       RETURNING id`,
      [caregiver2PassHash]
    );

    // 3. Health Worker
    await DatabasePool.query(
      `INSERT INTO users (id, username, password_hash, role)
       VALUES ('33333333-3333-3333-3333-333333333333', 'health_worker_dutta', $1, 'HEALTH_WORKER')`,
      [hwPassHash]
    );

    // 4. Admin
    await DatabasePool.query(
      `INSERT INTO users (id, username, password_hash, role)
       VALUES ('44444444-4444-4444-4444-444444444444', 'admin_ner', $1, 'ADMIN')`,
      [adminPassHash]
    );

    // 5. Patient User
    await DatabasePool.query(
      `INSERT INTO users (id, username, password_hash, role)
       VALUES ('55555555-5555-5555-5555-555555555555', 'patient_bhaben', $1, 'PATIENT')`,
      [patientPassHash]
    );

    // Seed Patients:
    // Patient 1: Assigned to Caregiver 1 (Pranjal)
    await DatabasePool.query(
      `INSERT INTO patients (id, display_name, caregiver_id, preferred_language, secondary_language)
       VALUES ('patient-ner-001', 'Bhaben Sharma', $1, 'en', 'as')
       ON CONFLICT (id) DO NOTHING`,
      [cg1.rows[0].id]
    );

    // Patient 2: Assigned to Caregiver 2 (Anita) - used to verify IDOR isolation
    await DatabasePool.query(
      `INSERT INTO patients (id, display_name, caregiver_id, preferred_language, secondary_language)
       VALUES ('patient-ner-002', 'Anupama Barua', $1, 'as', 'en')
       ON CONFLICT (id) DO NOTHING`,
      [cg2.rows[0].id]
    );

    console.log('[Migration] Initial users and patients seeded successfully.');
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].includes('migrate')) {
  runDatabaseMigrations()
    .then(() => {
      console.log('[Migration] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration Failed]', err);
      process.exit(1);
    });
}
