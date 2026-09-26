export interface AuditEntry {
  timestamp: string;
  eventType: 'AUTH_LOGIN' | 'AUTH_LOGOUT' | 'SYNC_BATCH' | 'ALERT_TRIGGERED' | 'PROFILE_ACCESS' | 'SECURITY_VIOLATION';
  actorId: string;
  ipAddress: string;
  userAgent?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private static logs: AuditEntry[] = [];
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'authorization',
    'secret',
    'cookie',
    'key',
  ]);

  /**
   * Redacts sensitive fields from audit metadata to prevent credential leakage in logs.
   */
  public static sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitize(item));

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public static log(entry: Omit<AuditEntry, 'timestamp'>): AuditEntry {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      metadata: entry.metadata ? this.sanitize(entry.metadata) : undefined,
    };

    this.logs.push(fullEntry);
    // In production, emit to structured stream (OpenTelemetry / fluentd / stdout)
    return fullEntry;
  }

  public static getRecentLogs(limit: number = 50): AuditEntry[] {
    return this.logs.slice(-limit);
  }

  public static clear(): void {
    this.logs = [];
  }
}
