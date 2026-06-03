import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateMatterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  internalRef!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  externalRef?: string;

  @IsUUID()
  @IsOptional()
  participantId?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsNotEmpty()
  statusKey!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateMatterDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  externalRef?: string;

  @IsUUID()
  @IsOptional()
  participantId?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  statusKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
