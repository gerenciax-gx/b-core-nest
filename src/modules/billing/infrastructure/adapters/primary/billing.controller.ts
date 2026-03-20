import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Inject,
  Res,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { BillingUseCasePort } from '../../../domain/ports/input/billing.usecase.port.js';
import { PayInvoiceDto } from '../../../application/dto/pay-invoice.dto.js';
import { CancelSubscriptionDto } from '../../../application/dto/cancel-subscription.dto.js';
import { UpdateBillingInfoDto } from '../../../application/dto/update-billing-info.dto.js';
import { ListInvoicesQueryDto } from '../../../application/dto/list-invoices-query.dto.js';
import {
  InvoicePaginatedResponseDto,
  InvoiceDetailSuccessResponseDto,
  PayInvoiceSuccessResponseDto,
  SubscriptionListResponseDto,
  BillingInfoSuccessResponseDto,
  CancelSubscriptionSuccessResponseDto,
} from '../../../application/dto/billing-response-wrapper.dto.js';
import { ApiErrorResponseDto } from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    @Inject('BillingUseCasePort')
    private readonly billingService: BillingUseCasePort,
  ) {}

  // ── GET /billing/invoices ──────────────────────────────────
  @Get('invoices')
  @ApiOperation({ summary: 'Listar faturas do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de faturas',
    type: InvoicePaginatedResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async listInvoices(
    @CurrentTenant() tenantId: string,
    @Query() query: ListInvoicesQueryDto,
  ) {
    const result = await this.billingService.getInvoicesByTenant(tenantId, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const totalPages = limit > 0 ? Math.ceil(result.total / limit) : 0;

    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  // ── GET /billing/invoices/:id ──────────────────────────────
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Detalhe de uma fatura' })
  @ApiParam({ name: 'id', description: 'UUID da fatura' })
  @ApiResponse({
    status: 200,
    description: 'Fatura encontrada',
    type: InvoiceDetailSuccessResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada', type: ApiErrorResponseDto })
  async getInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.billingService.getInvoiceById(tenantId, id);
    return { success: true, data };
  }

  // ── GET /billing/invoices/:id/pdf ──────────────────────────
  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Baixar PDF da fatura' })
  @ApiParam({ name: 'id', description: 'UUID da fatura' })
  @ApiResponse({ status: 200, description: 'PDF da fatura' })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada', type: ApiErrorResponseDto })
  @Header('Content-Type', 'application/pdf')
  async downloadInvoicePdf(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.billingService.generateInvoicePdf(tenantId, id);
    res.set({
      'Content-Disposition': `attachment; filename="fatura-${id.substring(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  // ── POST /billing/invoices/:id/pay ─────────────────────────
  @Post('invoices/:id/pay')
  @ApiOperation({ summary: 'Pagar fatura' })
  @ApiParam({ name: 'id', description: 'UUID da fatura' })
  @ApiResponse({
    status: 201,
    description: 'Cobrança criada no gateway',
    type: PayInvoiceSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Fatura indisponível ou dados de cobrança ausentes',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada', type: ApiErrorResponseDto })
  async payInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    const data = await this.billingService.payInvoice(tenantId, id, dto);
    return { success: true, data };
  }

  // ── GET /billing/subscriptions ─────────────────────────────
  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar assinaturas do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Lista de assinaturas',
    type: SubscriptionListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async listSubscriptions(@CurrentTenant() tenantId: string) {
    const data = await this.billingService.getSubscriptionsByTenant(tenantId);
    return { success: true, data };
  }

  // ── POST /billing/subscriptions/:id/cancel ─────────────────
  @Post('subscriptions/:id/cancel')
  @Roles('admin')
  @ApiOperation({ summary: 'Cancelar assinatura (admin)' })
  @ApiParam({ name: 'id', description: 'UUID da assinatura' })
  @ApiResponse({
    status: 201,
    description: 'Assinatura cancelada',
    type: CancelSubscriptionSuccessResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada', type: ApiErrorResponseDto })
  async cancelSubscription(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    await this.billingService.cancelSubscription(tenantId, id, dto.reason);
    return { success: true, message: 'Assinatura cancelada' };
  }

  // ── GET /billing/info ──────────────────────────────────────
  @Get('info')
  @ApiOperation({ summary: 'Dados de cobrança do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Dados de cobrança',
    type: BillingInfoSuccessResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getBillingInfo(@CurrentTenant() tenantId: string) {
    const data = await this.billingService.getBillingInfo(tenantId);
    return { success: true, data };
  }

  // ── PUT /billing/info ─────────────────────────────────────
  @Put('info')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar dados de cobrança (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Dados atualizados',
    type: BillingInfoSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ApiErrorResponseDto })
  async updateBillingInfo(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateBillingInfoDto,
  ) {
    const data = await this.billingService.updateBillingInfo(tenantId, dto);
    return { success: true, data };
  }
}
