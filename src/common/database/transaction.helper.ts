import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database.constants.js';

/**
 * Represents a Drizzle database client — either the main connection or a transaction.
 * Used as optional parameter in repository methods for transactional operations.
 */
export type DbClient = NodePgDatabase;

@Injectable()
export class TransactionManager {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Executes the callback within a database transaction.
   * If the callback throws, the transaction is rolled back automatically.
   */
  async run<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
