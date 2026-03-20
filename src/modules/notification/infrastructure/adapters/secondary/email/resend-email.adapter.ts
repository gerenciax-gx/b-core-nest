import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type {
  EmailSenderPort,
  SendEmailInput,
} from '../../../../domain/ports/output/email-sender.port.js';

@Injectable()
export class ResendEmailAdapter implements EmailSenderPort {
  private readonly logger = new Logger(ResendEmailAdapter.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('email.resendApiKey') ?? '';
    this.fromAddress =
      this.config.get<string>('email.fromAddress') ??
      'GerenciaX <noreply@gerenciax.com.br>';
    this.resend = new Resend(apiKey);

    if (!apiKey) {
      this.logger.warn('Resend API key is not configured — emails will fail');
    }
  }

  async send(input: SendEmailInput): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${input.to}: ${(error as Error).message}`,
      );
      // Don't throw — email failures should not break the main flow
    }
  }
}
