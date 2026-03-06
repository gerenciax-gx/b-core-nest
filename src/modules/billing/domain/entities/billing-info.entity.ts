/**
 * BillingInfo represents the billing/customer data for a tenant
 * in the payment gateway (Asaas).
 */
export class BillingInfo {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _customerExternalId: string | null,
    private _document: string,
    private _name: string,
    private _email: string,
    private _phone: string | null,
    private _addressStreet: string | null,
    private _addressNumber: string | null,
    private _addressComplement: string | null,
    private _addressNeighborhood: string | null,
    private _addressCity: string | null,
    private _addressState: string | null,
    private _addressZipCode: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get customerExternalId(): string | null {
    return this._customerExternalId;
  }
  get document(): string {
    return this._document;
  }
  get name(): string {
    return this._name;
  }
  get email(): string {
    return this._email;
  }
  get phone(): string | null {
    return this._phone;
  }
  get addressStreet(): string | null {
    return this._addressStreet;
  }
  get addressNumber(): string | null {
    return this._addressNumber;
  }
  get addressComplement(): string | null {
    return this._addressComplement;
  }
  get addressNeighborhood(): string | null {
    return this._addressNeighborhood;
  }
  get addressCity(): string | null {
    return this._addressCity;
  }
  get addressState(): string | null {
    return this._addressState;
  }
  get addressZipCode(): string | null {
    return this._addressZipCode;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  setCustomerExternalId(externalId: string): void {
    this._customerExternalId = externalId;
    this._updatedAt = new Date();
  }

  update(data: {
    document?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressNeighborhood?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZipCode?: string | null;
  }): void {
    if (data.document !== undefined) this._document = data.document;
    if (data.name !== undefined) this._name = data.name;
    if (data.email !== undefined) this._email = data.email;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.addressStreet !== undefined)
      this._addressStreet = data.addressStreet;
    if (data.addressNumber !== undefined)
      this._addressNumber = data.addressNumber;
    if (data.addressComplement !== undefined)
      this._addressComplement = data.addressComplement;
    if (data.addressNeighborhood !== undefined)
      this._addressNeighborhood = data.addressNeighborhood;
    if (data.addressCity !== undefined) this._addressCity = data.addressCity;
    if (data.addressState !== undefined) this._addressState = data.addressState;
    if (data.addressZipCode !== undefined)
      this._addressZipCode = data.addressZipCode;
    this._updatedAt = new Date();
  }
}
