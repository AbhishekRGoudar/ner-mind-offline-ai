import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { syncRouter } from './sync/syncRouter.js';
import { caregiverRouter } from './caregiver/caregiverRouter.js';
import { voiceRouter } from './voice/voiceRouter.js';
import { AuthService, requireRole } from './auth/rbacMiddleware.js';
import { PasswordService } from './auth/passwordService.js';
import { UserRepository } from './auth/userRepository.js';
import { createRateLimiter } from './security/rateLimiter.js';
import { AuditLogger } from './security/auditLogger.js';

export const app = express();

// 1. Security Headers (OWASP ASVS baseline)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// 2. Cross-Origin Resource Sharing
const corsOriginConfig = process.env.CORS_ORIGIN
  ? (process.env.CORS_ORIGIN.includes(',') ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : process.env.CORS_ORIGIN.trim())
  : '*';

app.use(cors({
  origin: corsOriginConfig,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 3. Request Parsing with strict payload size limit (DoS defense)
app.use(express.json({ limit: '2mb' }));

// 4. Rate Limiting: 100 requests per minute per IP
app.use('/api/', createRateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication Endpoint: POST /api/v1/auth/login
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Username and password required.' });
  }

  const user = await UserRepository.findByUsername(username);

  // Check account lockout
  if (user && user.lockedUntil && Date.now() < user.lockedUntil) {
    AuditLogger.log({
      eventType: 'AUTH_LOGIN',
      actorId: username,
      ipAddress: req.ip || 'unknown',
      outcome: 'FAILURE',
      metadata: { reason: 'Account locked due to excessive failed attempts' },
    });

    return res.status(423).json({
      error: 'Account Locked',
      message: 'Account is temporarily locked due to repeated failed login attempts. Please try again after 15 minutes.',
    });
  }

  // Verify credentials
  let isValid = false;
  if (user) {
    try {
      isValid = await PasswordService.verifyPassword(password, user.passwordHash);
    } catch {
      isValid = false;
    }
  }

  if (!isValid) {
    // Record failure and check for lockout
    if (user) {
      const lockStatus = await UserRepository.recordFailedLogin(username);
      if (lockStatus.locked) {
        AuditLogger.log({
          eventType: 'SECURITY_VIOLATION',
          actorId: username,
          ipAddress: req.ip || 'unknown',
          outcome: 'FAILURE',
          metadata: { reason: 'Account lockout triggered after 5 consecutive failures' },
        });
      }
    }

    AuditLogger.log({
      eventType: 'AUTH_LOGIN',
      actorId: username,
      ipAddress: req.ip || 'unknown',
      outcome: 'FAILURE',
      metadata: { reason: 'Invalid credentials' },
    });

    // Generic error message prevents username enumeration
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid username or password.',
    });
  }

  // Successful login: reset failed counter
  await UserRepository.resetFailedLogin(username);

  const token = await AuthService.createSession({
    userId: user!.id,
    username: user!.username,
    role: user!.role,
    patientId: user!.patientId,
  });

  AuditLogger.log({
    eventType: 'AUTH_LOGIN',
    actorId: user!.id,
    ipAddress: req.ip || 'unknown',
    outcome: 'SUCCESS',
    metadata: { role: user!.role },
  });

  return res.json({ token, role: user!.role, userId: user!.id });
});

// Logout Endpoint: POST /api/v1/auth/logout
app.post('/api/v1/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing Authorization header.' });
  }

  const rawToken = authHeader.substring(7);
  await AuthService.revokeSession(rawToken);

  AuditLogger.log({
    eventType: 'AUTH_LOGOUT',
    actorId: req.ip || 'unknown',
    ipAddress: req.ip || 'unknown',
    outcome: 'SUCCESS',
    metadata: { action: 'Session revoked' },
  });

  return res.status(200).json({ message: 'Logged out successfully.' });
});

// 5. Mount Sub-Routers
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1/caregiver', requireRole(['CAREGIVER', 'HEALTH_WORKER', 'ADMIN']), caregiverRouter);
app.use('/api/v1/voice', voiceRouter);

// 6. Centralized Error Handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  AuditLogger.log({
    eventType: 'SECURITY_VIOLATION',
    actorId: (req as any).user?.userId ?? 'anonymous',
    ipAddress: req.ip || 'unknown',
    outcome: 'FAILURE',
    metadata: { error: err.message },
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred.',
  });
});
