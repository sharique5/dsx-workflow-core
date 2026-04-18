import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}

export class UpdateClientDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}
