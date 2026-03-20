import { randomUUID } from 'node:crypto';

export type NotificationType =
  | 'payment_confirmed'
  | 'payment_overdue'
  | 'subscription_activated'
  | 'trial_expired'
  | 'tool_new'
  | 'system_maintenance'
  | 'stock_alert';

export interface CreateNotificationProps {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class Notification {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _type: NotificationType,
    private _title: string,
    private _message: string,
    private _isRead: boolean,
    private _metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateNotificationProps): Notification {
    return new Notification(
      randomUUID(),
      props.tenantId,
      props.type,
      props.title,
      props.message,
      false,
      props.metadata ?? null,
      new Date(),
    );
  }

  static reconstitute(data: {
    id: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }): Notification {
    return new Notification(
      data.id,
      data.tenantId,
      data.type,
      data.title,
      data.message,
      data.isRead,
      data.metadata,
      data.createdAt,
    );
  }

  get type(): NotificationType {
    return this._type;
  }
  get title(): string {
    return this._title;
  }
  get message(): string {
    return this._message;
  }
  get isRead(): boolean {
    return this._isRead;
  }
  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  markAsRead(): void {
    this._isRead = true;
  }
}
