import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/index.js';
import { ResponseInterceptor } from './common/interceptors/index.js';
import { ValidationPipe } from './common/pipes/index.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Logging ────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Security ───────────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  // ── Config ─────────────────────────────────────────────────
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:4200',
    'http://localhost:8100',
  ]);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // ── CORS ───────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-client-type',
      'x-tenant-id',
    ],
  });

  // ── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // ── Global pipes, filters, interceptors ────────────────────
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Swagger (non-production only) ──────────────────────────
  if (nodeEnv !== 'prod') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GerenciaX API')
      .setDescription(
        'API do sistema GerenciaX — gestão multi-tenant para salões e barbearias',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${port}`)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ── Start ──────────────────────────────────────────────────
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    `🚀 GerenciaX API running on http://localhost:${port} [${nodeEnv}]`,
    'Bootstrap',
  );

  if (nodeEnv !== 'prod') {
    logger.log(`📚 Swagger docs at http://localhost:${port}/docs`, 'Bootstrap');
  }
}

void bootstrap();
