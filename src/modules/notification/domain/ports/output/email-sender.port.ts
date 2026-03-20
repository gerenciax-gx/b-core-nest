export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSenderPort {
  send(input: SendEmailInput): Promise<void>;
}
