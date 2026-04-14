import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEnum([UserRole.staff, UserRole.admin])
  role!: UserRole.staff | UserRole.admin;
}
