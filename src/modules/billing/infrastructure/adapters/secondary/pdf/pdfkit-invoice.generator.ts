import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { PdfGeneratorPort } from '../../../../domain/ports/output/pdf-generator.port.js';
import type {
  InvoiceDetail,
  BillingInfoSummary,
} from '../../../../domain/ports/input/billing.usecase.port.js';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

/** Strip control chars that could break PDF structure */
function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

@Injectable()
export class PdfKitInvoiceGenerator implements PdfGeneratorPort {
  async generateInvoicePdf(
    invoice: InvoiceDetail,
    billingInfo: BillingInfoSummary | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Uint8Array[] = [];

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc);
      this.renderInvoiceMeta(doc, invoice);
      this.renderBillingInfo(doc, billingInfo);
      this.renderItemsTable(doc, invoice);
      this.renderTotal(doc, invoice);
      this.renderFooter(doc);

      doc.end();
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument): void {
    doc
      .fontSize(24)
      .fillColor('#4F46E5')
      .text('GerenciaX', 50, 50)
      .fontSize(10)
      .fillColor('#6B7280')
      .text('Sistema de Gestão Empresarial', 50, 78);

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#E5E7EB').stroke();
    doc.moveDown(1.5);
  }

  private renderInvoiceMeta(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceDetail,
  ): void {
    const y = 115;

    doc.fontSize(16).fillColor('#111827').text('FATURA', 50, y);

    const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status;
    const statusColor = invoice.status === 'paid' ? '#059669' : invoice.status === 'overdue' ? '#DC2626' : '#D97706';

    doc.fontSize(12).fillColor(statusColor).text(statusLabel, 400, y, { align: 'right' });

    doc.fontSize(9).fillColor('#6B7280');

    const meta = [
      ['Nº da Fatura:', invoice.id.substring(0, 8).toUpperCase()],
      ['Referência:', this.formatReferenceMonth(invoice.referenceMonth)],
      ['Emissão:', this.formatDate(invoice.createdAt)],
      ['Vencimento:', this.formatDate(invoice.dueDate)],
    ];

    if (invoice.paidAt) {
      meta.push(['Pago em:', this.formatDate(invoice.paidAt)]);
    }

    let metaY = y + 28;
    for (const [label, value] of meta) {
      doc.fontSize(9).fillColor('#6B7280').text(label, 50, metaY);
      doc.fillColor('#111827').text(value, 140, metaY);
      metaY += 16;
    }

    doc.y = metaY + 10;
  }

  private renderBillingInfo(
    doc: PDFKit.PDFDocument,
    info: BillingInfoSummary | null,
  ): void {
    if (!info) return;

    const y = doc.y;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();

    doc
      .fontSize(11)
      .fillColor('#111827')
      .text('Dados do Cliente', 50, y + 12);

    let infoY = y + 30;
    doc.fontSize(9).fillColor('#374151');

    if (info.name) {
      doc.text(sanitizePdfText(info.name), 50, infoY);
      infoY += 14;
    }
    if (info.document) {
      const docLabel = info.document.length > 14 ? 'CNPJ' : 'CPF';
      doc.text(`${docLabel}: ${sanitizePdfText(info.document)}`, 50, infoY);
      infoY += 14;
    }
    if (info.email) {
      doc.text(sanitizePdfText(info.email), 50, infoY);
      infoY += 14;
    }

    const addressParts = [
      info.addressStreet,
      info.addressNumber,
      info.addressComplement,
      info.addressNeighborhood,
    ].filter(Boolean).map(sanitizePdfText);

    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), 50, infoY);
      infoY += 14;
    }

    const cityState = [info.addressCity, info.addressState]
      .filter(Boolean)
      .join(' - ');
    if (cityState) {
      const cep = info.addressZipCode ? ` — CEP: ${info.addressZipCode}` : '';
      doc.text(`${cityState}${cep}`, 50, infoY);
      infoY += 14;
    }

    doc.y = infoY + 10;
  }

  private renderItemsTable(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceDetail,
  ): void {
    const y = doc.y;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();

    // Table header
    const headerY = y + 12;
    doc.fontSize(9).fillColor('#6B7280');
    doc.text('Descrição', 50, headerY);
    doc.text('Qtd', 340, headerY, { width: 40, align: 'right' });
    doc.text('Unitário', 390, headerY, { width: 70, align: 'right' });
    doc.text('Total', 470, headerY, { width: 75, align: 'right' });

    doc
      .moveTo(50, headerY + 16)
      .lineTo(545, headerY + 16)
      .strokeColor('#E5E7EB')
      .stroke();

    // Table rows
    let rowY = headerY + 24;
    doc.fontSize(9).fillColor('#374151');

    for (const item of invoice.items) {
      if (rowY > 720) {
        doc.addPage();
        rowY = 50;
      }

      doc.text(item.description, 50, rowY, { width: 280 });
      doc.text(String(item.quantity), 340, rowY, { width: 40, align: 'right' });
      doc.text(this.formatCurrency(item.unitPrice), 390, rowY, {
        width: 70,
        align: 'right',
      });
      doc.text(this.formatCurrency(item.totalPrice), 470, rowY, {
        width: 75,
        align: 'right',
      });

      rowY += 20;
    }

    doc.y = rowY;
  }

  private renderTotal(
    doc: PDFKit.PDFDocument,
    invoice: InvoiceDetail,
  ): void {
    const y = doc.y + 5;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();

    doc
      .fontSize(11)
      .fillColor('#111827')
      .text('Total:', 350, y + 10, { width: 110, align: 'right' });
    doc
      .fontSize(13)
      .fillColor('#4F46E5')
      .text(this.formatCurrency(invoice.totalAmount), 470, y + 8, {
        width: 75,
        align: 'right',
      });

    doc.y = y + 35;
  }

  private renderFooter(doc: PDFKit.PDFDocument): void {
    const bottomY = 760;
    doc
      .moveTo(50, bottomY)
      .lineTo(545, bottomY)
      .strokeColor('#E5E7EB')
      .stroke();

    doc
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(
        'Este documento foi gerado automaticamente pelo GerenciaX. Em caso de dúvidas, entre em contato com nosso suporte.',
        50,
        bottomY + 8,
        { align: 'center', width: 495 },
      );
  }

  private formatCurrency(value: number): string {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }

  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR');
  }

  private formatReferenceMonth(ref: string): string {
    const [year, month] = ref.split('-');
    const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${months[monthIndex]} ${year}`;
  }
}
