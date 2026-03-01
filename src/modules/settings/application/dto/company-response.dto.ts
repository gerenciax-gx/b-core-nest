import { ApiProperty } from '@nestjs/swagger';

export class CompanyAddressDto {
  @ApiProperty({ nullable: true }) cep!: string | null;
  @ApiProperty({ nullable: true }) street!: string | null;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) complement!: string | null;
  @ApiProperty({ nullable: true }) neighborhood!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true }) state!: string | null;
  @ApiProperty({ nullable: true }) country!: string | null;
}

export class CompanyBusinessDataDto {
  @ApiProperty({ nullable: true }) openingDate!: string | null;
  @ApiProperty({ nullable: true }) businessHours!: string | null;
  @ApiProperty({ nullable: true }) specialties!: string | null;
  @ApiProperty({ nullable: true }) maxCapacity!: number | null;
  @ApiProperty({ nullable: true }) averageServiceTime!: number | null;
  @ApiProperty({ nullable: true }) paymentMethods!: string | null;
  @ApiProperty({ nullable: true }) cancellationPolicy!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
}

export class CompanySocialLinksDto {
  @ApiProperty({ nullable: true }) website!: string | null;
  @ApiProperty({ nullable: true }) instagram!: string | null;
  @ApiProperty({ nullable: true }) facebook!: string | null;
  @ApiProperty({ nullable: true }) whatsapp!: string | null;
}

export class CompanyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() companyType!: string;
  @ApiProperty({ nullable: true }) document!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;

  // Legal
  @ApiProperty({ nullable: true }) legalName!: string | null;
  @ApiProperty({ nullable: true }) stateRegistration!: string | null;
  @ApiProperty({ nullable: true }) municipalRegistration!: string | null;

  // Address
  @ApiProperty({ type: CompanyAddressDto }) address!: CompanyAddressDto;

  // Business
  @ApiProperty({ type: CompanyBusinessDataDto }) businessData!: CompanyBusinessDataDto;

  // Social
  @ApiProperty({ type: CompanySocialLinksDto }) socialLinks!: CompanySocialLinksDto;

  @ApiProperty() createdAt!: string;
}
