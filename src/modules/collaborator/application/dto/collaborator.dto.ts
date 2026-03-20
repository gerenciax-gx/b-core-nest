import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  IsEmail,
  MinLength,
  MaxLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Nested DTOs ─────────────────────────────────────────────

export class AddressDto {
  @ApiProperty({ example: '12345-678' })
  @IsString()
  @MaxLength(10)
  cep!: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MaxLength(255)
  street!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional({ example: 'Apto 4' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;
}

export class WorkScheduleDto {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve estar no formato HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'lunchStart deve estar no formato HH:mm' })
  lunchStart!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'lunchEnd deve estar no formato HH:mm' })
  lunchEnd!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:mm' })
  endTime!: string;

  @ApiProperty({ example: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  workDays!: string[];
}

export class ToolPermissionDto {
  @ApiProperty({ example: 'agendamento' })
  @IsString()
  @MaxLength(100)
  toolId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasAccess!: boolean;
}

// ── Create ──────────────────────────────────────────────────

export class CreateCollaboratorDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '12345678901', description: '11 dígitos' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf!: string;

  @ApiProperty({ example: '11999998888' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ enum: ['male', 'female', 'other', 'prefer_not_to_say'] })
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender!: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  birthDate?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ enum: ['admin', 'user'], default: 'user' })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allToolsAccess?: boolean;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: WorkScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkScheduleDto)
  workSchedule?: WorkScheduleDto;

  @ApiPropertyOptional({ type: [ToolPermissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolPermissionDto)
  toolPermissions?: ToolPermissionDto[];

  @ApiPropertyOptional({ example: 'Observações sobre o colaborador' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ── Update ──────────────────────────────────────────────────

export class UpdateCollaboratorDto {
  @ApiPropertyOptional({ example: 'João' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'joao@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf?: string;

  @ApiPropertyOptional({ example: '11999998888' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'prefer_not_to_say'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  birthDate?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ enum: ['admin', 'user'] })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allToolsAccess?: boolean;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: WorkScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkScheduleDto)
  workSchedule?: WorkScheduleDto;

  @ApiPropertyOptional({ type: [ToolPermissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolPermissionDto)
  toolPermissions?: ToolPermissionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ── Change Status ───────────────────────────────────────────

export class ChangeStatusDto {
  @ApiProperty({ enum: ['active', 'inactive', 'on_leave', 'away'] })
  @IsIn(['active', 'inactive', 'on_leave', 'away'])
  status!: 'active' | 'inactive' | 'on_leave' | 'away';
}

// ── Response ────────────────────────────────────────────────

export class ToolPermissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() toolId!: string;
  @ApiProperty() hasAccess!: boolean;
}

export class CollaboratorResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() cpf!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() gender!: string;
  @ApiPropertyOptional() birthDate!: string | null;
  @ApiProperty() timezone!: string;
  @ApiProperty() status!: string;
  @ApiProperty() role!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
  @ApiProperty() allToolsAccess!: boolean;
  @ApiPropertyOptional({ type: AddressDto }) address!: AddressDto | null;
  @ApiPropertyOptional({ type: WorkScheduleDto }) workSchedule!: WorkScheduleDto | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty({ type: [ToolPermissionResponseDto] }) toolPermissions!: ToolPermissionResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ── Create Response (includes temp password) ────────────────

export class CollaboratorCreateResponseDto extends CollaboratorResponseDto {
  @ApiProperty({ description: 'Senha temporária (exibida apenas 1 vez)' })
  temporaryPassword!: string;
}

// ── List Item (lighter) ─────────────────────────────────────

export class CollaboratorListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() status!: string;
  @ApiProperty() role!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
  @ApiProperty() createdAt!: string;
}
