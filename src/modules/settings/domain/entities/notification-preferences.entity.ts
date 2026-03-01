export class NotificationPreferences {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    private _emailNotifications: boolean,
    private _pushNotifications: boolean,
    private _smsNotifications: boolean,
    private _orderUpdates: boolean,
    private _promotions: boolean,
    private _securityAlerts: boolean,
    private _systemUpdates: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get emailNotifications(): boolean {
    return this._emailNotifications;
  }
  get pushNotifications(): boolean {
    return this._pushNotifications;
  }
  get smsNotifications(): boolean {
    return this._smsNotifications;
  }
  get orderUpdates(): boolean {
    return this._orderUpdates;
  }
  get promotions(): boolean {
    return this._promotions;
  }
  get securityAlerts(): boolean {
    return this._securityAlerts;
  }
  get systemUpdates(): boolean {
    return this._systemUpdates;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  update(data: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    orderUpdates?: boolean;
    promotions?: boolean;
    securityAlerts?: boolean;
    systemUpdates?: boolean;
  }): void {
    if (data.emailNotifications !== undefined)
      this._emailNotifications = data.emailNotifications;
    if (data.pushNotifications !== undefined)
      this._pushNotifications = data.pushNotifications;
    if (data.smsNotifications !== undefined)
      this._smsNotifications = data.smsNotifications;
    if (data.orderUpdates !== undefined)
      this._orderUpdates = data.orderUpdates;
    if (data.promotions !== undefined)
      this._promotions = data.promotions;
    if (data.securityAlerts !== undefined)
      this._securityAlerts = data.securityAlerts;
    if (data.systemUpdates !== undefined)
      this._systemUpdates = data.systemUpdates;
    this._updatedAt = new Date();
  }
}
