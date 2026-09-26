import { app } from './app.js';
import { DatabasePool } from './db/dbPool.js';
import { runDatabaseMigrations } from './db/migrate.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  if (process.env.DATABASE_URL) {
    console.log('[NER-Mind Server] Initializing PostgreSQL connection from DATABASE_URL...');
    const connected = await DatabasePool.init(process.env.DATABASE_URL);
    if (connected) {
      await runDatabaseMigrations();
    } else {
      console.warn('[NER-Mind Server] Running with in-memory persistence fallback.');
    }
  } else {
    console.log('[NER-Mind Server] No DATABASE_URL provided. Running with in-memory persistence fallback.');
  }

  app.listen(PORT, () => {
    console.log(`[NER-Mind Server] Running securely on http://localhost:${PORT}`);
    console.log(`[Security Baseline] OWASP ASVS 5.0 Active, Helmet CSP & RateLimiting Enabled.`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server Bootstrap Error]', err);
  process.exit(1);
});
