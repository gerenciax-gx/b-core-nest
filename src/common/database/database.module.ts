import { Module, Global, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DATABASE_CONNECTION } from './database.constants.js';
import { TransactionManager } from './transaction.helper.js';

export { DATABASE_CONNECTION } from './database.constants.js';

const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): pg.Pool => {
        const pool = new pg.Pool({
          connectionString: configService.get<string>('database.url'),
          max: configService.get<number>('database.maxConnections', 10),
        });

        const logger = new Logger('DatabasePool');
        pool.on('error', (err) => {
          logger.error('Unexpected idle client error', err.message);
        });

        return pool;
      },
    },
    {
      provide: DATABASE_CONNECTION,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): NodePgDatabase => drizzle(pool),
    },
    TransactionManager,
  ],
  exports: [DATABASE_CONNECTION, TransactionManager],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing database pool...');
    await this.pool.end();
  }
}
