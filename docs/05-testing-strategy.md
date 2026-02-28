# 05. Estratégia de Testes

> **Obrigatório:** Todo módulo deve ter testes. Cobertura mínima: 75% geral, 90% domain, 80% services.  
> **Stack:** Jest + Supertest + Testcontainers (PostgreSQL)

---

## 1. Pirâmide de Testes

```
        ┌────────────┐
        │    E2E     │  ← Poucos (fluxos críticos: auth, billing)
        │ (Supertest) │
        ├────────────┤
        │ Integration │  ← Médio (controllers + repos com DB de teste)
        │  (Jest +    │
        │  Supertest) │
        ├────────────┤
        │    Unit     │  ← Muitos (entities, services, mappers, VOs)
        │   (Jest)    │
        └────────────┘
```

### Cobertura Mínima Obrigatória

| Camada | Cobertura |
|--------|-----------|
| Domain Entities | 90%+ |
| Domain Value Objects | 90%+ |
| Application Services | 80%+ |
| Controllers | 70%+ |
| Geral | 75%+ |

---

## 2. Testes Unitários

### 2.1 Onde ficam
```
src/modules/{module}/domain/entities/{entity}.entity.spec.ts
src/modules/{module}/domain/value-objects/{vo}.vo.spec.ts
src/modules/{module}/domain/services/{service}.service.spec.ts
src/modules/{module}/application/services/{service}.service.spec.ts
src/modules/{module}/application/mappers/{mapper}.mapper.spec.ts
```

### 2.2 Teste de Domain Entity

```typescript
// domain/entities/invoice.entity.spec.ts
import { Invoice } from './invoice.entity';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { Money } from '../value-objects/money.vo';

describe('Invoice Entity', () => {
  const createInvoice = (overrides?: Partial<ConstructorParameters<typeof Invoice>>) => {
    return new Invoice(
      'invoice-1',
      'tenant-1',
      'sub-1',
      'pending',
      Money.create(89.80),
      new Date('2026-03-05'),
      null,
      [],
      new Date(),
      ...Object.values(overrides ?? {}),
    );
  };

  describe('confirmPayment', () => {
    it('deve confirmar pagamento de fatura pendente', () => {
      const invoice = createInvoice();
      const paidAt = new Date();

      invoice.confirmPayment(paidAt);

      expect(invoice.status).toBe('paid');
      expect(invoice.paidAt).toBe(paidAt);
    });

    it('deve lançar exceção se fatura já está paga', () => {
      const invoice = createInvoice();
      invoice.confirmPayment(new Date());

      expect(() => invoice.confirmPayment(new Date()))
        .toThrow(DomainException);
      expect(() => invoice.confirmPayment(new Date()))
        .toThrow('Fatura já está paga');
    });

    it('deve lançar exceção se fatura está cancelada', () => {
      const invoice = createInvoice();
      invoice.cancel();

      expect(() => invoice.confirmPayment(new Date()))
        .toThrow('Não é possível confirmar fatura cancelada');
    });
  });

  describe('markAsOverdue', () => {
    it('deve marcar fatura pendente como vencida', () => {
      const invoice = createInvoice();

      invoice.markAsOverdue();

      expect(invoice.status).toBe('overdue');
    });

    it('não deve marcar fatura paga como vencida', () => {
      const invoice = createInvoice();
      invoice.confirmPayment(new Date());

      expect(() => invoice.markAsOverdue())
        .toThrow('Apenas faturas pendentes podem ser marcadas como vencidas');
    });
  });

  describe('isOverdue', () => {
    it('deve retornar true se pendente e vencida', () => {
      const invoice = new Invoice(
        'inv-1', 'ten-1', 'sub-1', 'pending',
        Money.create(100), new Date('2020-01-01'), // data passada
        null, [], new Date(),
      );

      expect(invoice.isOverdue()).toBe(true);
    });

    it('deve retornar false se paga', () => {
      const invoice = createInvoice();
      invoice.confirmPayment(new Date());

      expect(invoice.isOverdue()).toBe(false);
    });
  });

  describe('getDaysOverdue', () => {
    it('deve retornar 0 se não está vencida', () => {
      const invoice = createInvoice();
      expect(invoice.getDaysOverdue()).toBe(0);
    });
  });
});
```

### 2.3 Teste de Value Object

```typescript
// domain/value-objects/money.vo.spec.ts
import { Money } from './money.vo';
import { DomainException } from '../../../../common/exceptions/domain.exception';

describe('Money Value Object', () => {
  describe('create', () => {
    it('deve criar Money com valor válido', () => {
      const money = Money.create(49.90);
      expect(money.amount).toBe(49.90);
      expect(money.currency).toBe('BRL');
    });

    it('deve arredondar para 2 casas decimais', () => {
      const money = Money.create(49.999);
      expect(money.amount).toBe(50.00);
    });

    it('deve lançar exceção para valor negativo', () => {
      expect(() => Money.create(-10))
        .toThrow('Valor monetário não pode ser negativo');
    });
  });

  describe('add', () => {
    it('deve somar valores corretamente', () => {
      const a = Money.create(49.90);
      const b = Money.create(39.90);
      const result = a.add(b);
      expect(result.amount).toBe(89.80);
    });

    it('deve lançar exceção para moedas diferentes', () => {
      const brl = Money.create(100, 'BRL');
      const usd = Money.create(100, 'USD');
      expect(() => brl.add(usd))
        .toThrow('Não é possível operar com moedas diferentes');
    });
  });

  describe('subtract', () => {
    it('deve subtrair valores corretamente', () => {
      const a = Money.create(89.80);
      const b = Money.create(49.90);
      expect(a.subtract(b).amount).toBe(39.90);
    });
  });

  describe('equals', () => {
    it('deve comparar igualdade corretamente', () => {
      const a = Money.create(49.90);
      const b = Money.create(49.90);
      expect(a.equals(b)).toBe(true);
    });
  });
});
```

### 2.4 Teste de Application Service (Mock dos Ports)

```typescript
// application/services/product.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductRepositoryPort } from '../../domain/ports/output/product.repository.port';
import { Product } from '../../domain/entities/product.entity';
import { Money } from '../../domain/value-objects/money.vo';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: jest.Mocked<ProductRepositoryPort>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Mock factory
  const mockProductRepo: jest.Mocked<ProductRepositoryPort> = {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenant: jest.fn(),
    findBySkuAndTenant: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  } as unknown as jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: 'ProductRepositoryPort', useValue: mockProductRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get('ProductRepositoryPort');
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Produto Teste',
      sku: 'TST-001',
      basePrice: 49.90,
      status: 'ATIVO' as const,
    };
    const tenantId = 'tenant-1';

    it('deve criar produto com sucesso', async () => {
      // Arrange
      productRepo.findBySkuAndTenant.mockResolvedValue(null);
      const savedProduct = Product.create({ ...createDto, tenantId });
      productRepo.save.mockResolvedValue(savedProduct);

      // Act
      const result = await service.create(tenantId, createDto);

      // Assert
      expect(productRepo.findBySkuAndTenant).toHaveBeenCalledWith('TST-001', tenantId);
      expect(productRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.created', expect.any(Object));
      expect(result.name).toBe('Produto Teste');
      expect(result.sku).toBe('TST-001');
    });

    it('deve lançar ConflictException se SKU duplicado', async () => {
      // Arrange
      const existing = Product.create({ ...createDto, tenantId });
      productRepo.findBySkuAndTenant.mockResolvedValue(existing);

      // Act & Assert
      await expect(service.create(tenantId, createDto))
        .rejects.toThrow(ConflictException);
      expect(productRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve retornar produto se existir', async () => {
      const product = Product.create({
        tenantId: 'tenant-1',
        name: 'Teste',
        sku: 'TST',
        basePrice: 10,
      });
      productRepo.findById.mockResolvedValue(product);

      const result = await service.findById('tenant-1', product.id);

      expect(result.name).toBe('Teste');
    });

    it('deve lançar NotFoundException se não existir', async () => {
      productRepo.findById.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException se tenant não bate', async () => {
      const product = Product.create({
        tenantId: 'tenant-1',
        name: 'Teste',
        sku: 'TST',
        basePrice: 10,
      });
      productRepo.findById.mockResolvedValue(product);

      await expect(service.findById('tenant-2', product.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve deletar produto existente', async () => {
      const product = Product.create({
        tenantId: 'tenant-1',
        name: 'Teste',
        sku: 'TST',
        basePrice: 10,
      });
      productRepo.findById.mockResolvedValue(product);
      productRepo.delete.mockResolvedValue(undefined);

      await service.remove('tenant-1', product.id);

      expect(productRepo.delete).toHaveBeenCalledWith(product.id);
    });
  });
});
```

---

## 3. Testes de Integração

### 3.1 Setup com Banco de Teste

```typescript
// test/helpers/test-database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../src/common/database/schema';

export async function createTestDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL
    ?? 'postgresql://test:test@localhost:5432/gerenciax_test';

  const client = postgres(connectionString, { max: 5 });
  const db = drizzle(client, { schema });

  return { db, client };
}

export async function cleanDatabase(db: DrizzleDatabase) {
  // Limpar tabelas na ordem correta (respeitando FKs)
  await db.delete(schema.invoiceItems);
  await db.delete(schema.invoices);
  await db.delete(schema.subscribedTools);
  await db.delete(schema.subscriptions);
  await db.delete(schema.collaboratorToolPermissions);
  await db.delete(schema.collaborators);
  await db.delete(schema.productVariations);
  await db.delete(schema.products);
  await db.delete(schema.services);
  await db.delete(schema.users);
  await db.delete(schema.tenants);
}
```

### 3.2 Teste de Integração de Controller

```typescript
// test/integration/product.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { cleanDatabase, createTestDatabase } from '../helpers/test-database';

describe('ProductController (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Criar tenant e user para testes
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test@1234',
        passwordConfirm: 'Test@1234',
        companyName: 'Test Company',
        companyType: 'produtos',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test@1234' });

    accessToken = loginResponse.body.data.accessToken;
    tenantId = loginResponse.body.data.user.tenantId;
  });

  afterAll(async () => {
    await cleanDatabase(app.get('DRIZZLE'));
    await app.close();
  });

  describe('POST /api/v1/products', () => {
    it('deve criar produto com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Camiseta Básica',
          sku: 'CAM-001',
          basePrice: 49.90,
          stock: 100,
          minStock: 10,
          trackInventory: true,
          status: 'ATIVO',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Camiseta Básica',
        sku: 'CAM-001',
        basePrice: 49.90,
        status: 'ATIVO',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('deve rejeitar produto sem nome', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'CAM-002', basePrice: 10 })
        .expect(400);
    });

    it('deve rejeitar SKU duplicado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Duplicada', sku: 'CAM-001', basePrice: 10, status: 'ATIVO' })
        .expect(409);
    });

    it('deve rejeitar sem autenticação', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ name: 'Teste', sku: 'TST', basePrice: 10, status: 'ATIVO' })
        .expect(401);
    });
  });

  describe('GET /api/v1/products', () => {
    it('deve listar produtos do tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThan(0);
    });

    it('deve paginar corretamente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('deve retornar 404 para ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
```

---

## 4. Testes E2E

### 4.1 Fluxos Críticos para E2E

| Fluxo | Arquivo | Prioridade |
|-------|---------|-----------|
| Signup → Login → Dashboard | `auth.e2e-spec.ts` | Alta |
| CRUD completo de Produtos | `product.e2e-spec.ts` | Alta |
| Criar Colaborador → Login com senha temp → Redefinir | `collaborator.e2e-spec.ts` | Alta |
| Assinar ferramenta → Gerar fatura → Pagar | `billing.e2e-spec.ts` | Crítica |
| Webhook Asaas → Confirmar pagamento | `webhook.e2e-spec.ts` | Crítica |

### 4.2 Exemplo E2E: Auth Flow

```typescript
// test/e2e/auth.e2e-spec.ts
describe('Auth E2E Flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup completo da aplicação
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Aplicar TODOS os middlewares como em produção
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await cleanDatabase(app.get('DRIZZLE'));
    await app.close();
  });

  it('fluxo completo: signup → login → acessar dashboard → refresh token', async () => {
    // 1. Signup
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        name: 'Ricardo Silva',
        email: 'ricardo@empresa.com',
        password: 'Teste@1234',
        passwordConfirm: 'Teste@1234',
        companyName: 'Empresa Teste',
        companyType: 'servicos',
      })
      .expect(201);

    expect(signupRes.body.data.user.email).toBe('ricardo@empresa.com');
    expect(signupRes.body.data.user.role).toBe('admin');

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ricardo@empresa.com', password: 'Teste@1234' })
      .expect(200);

    const { accessToken } = loginRes.body.data;
    expect(accessToken).toBeDefined();

    // 3. Dashboard
    const dashRes = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(dashRes.body.data.user.email).toBe('ricardo@empresa.com');

    // 4. Refresh Token
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginRes.headers['set-cookie'])
      .expect(200);

    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.accessToken).not.toBe(accessToken);
  });

  it('fluxo colaborador: admin cria → colaborador faz login → obrigado a redefinir senha', async () => {
    // 1. Admin login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ricardo@empresa.com', password: 'Teste@1234' })
      .expect(200);

    const adminToken = loginRes.body.data.accessToken;

    // 2. Admin cria colaborador
    const collabRes = await request(app.getHttpServer())
      .post('/api/v1/collaborators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@empresa.com',
        cpf: '12345678901',
        phone: '11999998888',
        gender: 'Feminino',
        status: 'Ativo',
        role: 'Usuário',
        allToolsAccess: false,
        toolPermissions: [],
      })
      .expect(201);

    const tempPassword = collabRes.body.data.temporaryPassword;

    // 3. Colaborador login com senha temporária
    const collabLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'maria@empresa.com', password: tempPassword })
      .expect(200);

    expect(collabLoginRes.body.data.user.mustResetPassword).toBe(true);
    const collabToken = collabLoginRes.body.data.accessToken;

    // 4. Tentar acessar dashboard → bloqueado (ForcePasswordResetGuard)
    await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(403);

    // 5. Redefinir senha
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .set('Authorization', `Bearer ${collabToken}`)
      .send({
        currentPassword: tempPassword,
        newPassword: 'NovaSenha@123',
        confirmPassword: 'NovaSenha@123',
      })
      .expect(200);

    // 6. Login com nova senha → acesso normal
    const newLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'maria@empresa.com', password: 'NovaSenha@123' })
      .expect(200);

    expect(newLoginRes.body.data.user.mustResetPassword).toBe(false);
  });
});
```

---

## 5. Mocking de Ports — Padrão

### 5.1 Criar Mock Factories

```typescript
// test/factories/mock-repository.factory.ts
export function createMockRepository<T>(): jest.Mocked<T> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenant: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<T>;
}

// Uso:
const mockRepo = createMockRepository<ProductRepositoryPort>();
```

### 5.2 Criar Test Factories

```typescript
// test/factories/product.factory.ts
import { Product } from '../../src/modules/product/domain/entities/product.entity';

export class ProductFactory {
  static create(overrides?: Partial<CreateProductProps>): Product {
    return Product.create({
      tenantId: 'tenant-test',
      name: 'Produto Teste',
      sku: `TST-${Date.now()}`,
      basePrice: 49.90,
      stock: 100,
      minStock: 10,
      trackInventory: true,
      status: 'ATIVO',
      ...overrides,
    });
  }

  static createMany(count: number, overrides?: Partial<CreateProductProps>): Product[] {
    return Array.from({ length: count }, (_, i) =>
      ProductFactory.create({ sku: `TST-${i}`, ...overrides }),
    );
  }
}
```

---

## 6. Configuração do Jest

```typescript
// jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.schema.ts',
    '!src/common/database/**',
  ],
  coverageDirectory: './coverage',
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
};
```

```json
// package.json (scripts)
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand"
  }
}
```

---

## 7. Regras de Teste — Resumo

| # | Nível | Regra |
|---|-------|-------|
| T-001 | 🚫 CRITICAL | Todo service novo DEVE ter arquivo `.spec.ts` correspondente |
| T-002 | 🚫 CRITICAL | Toda entity nova DEVE ter testes de todos os métodos de negócio |
| T-003 | 🚫 CRITICAL | Mocks de Ports são obrigatórios em testes unitários |
| T-004 | ⚠️ REQUIRED | **PROIBIDO** testar lógica de negócio em teste de integração — isso é teste unitário |
| T-005 | ⚠️ REQUIRED | Testes E2E usam banco de teste real (PostgreSQL) |
| T-006 | ⚠️ REQUIRED | Limpar banco entre suites E2E (`afterAll → cleanDatabase`) |
| T-007 | 💡 RECOMMENDED | Usar factories para criar entidades de teste |
| T-008 | ⚠️ REQUIRED | Testes devem ser independentes (não depender de ordem) |
| T-009 | 💡 RECOMMENDED | Nomes descritivos: `deve lançar exceção se fatura já está paga` |
| T-010 | 💡 RECOMMENDED | `describe` agrupa por método, `it` descreve o cenário |
| T-011 | ⚠️ REQUIRED | Padrão AAA: Arrange → Act → Assert |
| T-012 | ⚠️ REQUIRED | `jest.clearAllMocks()` no `beforeEach` |
| T-013 | ⚠️ REQUIRED | CI roda `npm test -- --coverage` e falha se abaixo do threshold |

---

> **Skill File v1.0** — Estratégia de Testes  
> **Regra:** PR sem testes para lógica nova será rejeitado.
