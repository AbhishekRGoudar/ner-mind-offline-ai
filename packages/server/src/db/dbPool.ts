import pg from 'pg';

const { Pool } = pg;

export class DatabasePool {
  private static pool: pg.Pool | null = null;
  private static isConnected = false;

  public static async init(connectionString?: string): Promise<boolean> {
    const url = connectionString || process.env.DATABASE_URL;
    if (!url) {
      this.isConnected = false;
      return false;
    }

    try {
      this.pool = new Pool({
        connectionString: url,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('[PostgreSQL] Connected successfully to database.');
      return true;
    } catch (e: any) {
      console.warn('[PostgreSQL] Connection failed or database not reachable. Operating in in-memory fallback mode.', e?.message || e);
      this.isConnected = false;
      this.pool = null;
      return false;
    }
  }

  public static isAvailable(): boolean {
    return this.isConnected && this.pool !== null;
  }

  public static async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database pool not connected.');
    }
    return this.pool.query<T>(text, params);
  }

  public static async withTransaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database pool not connected.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  public static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}
