import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  MaxLength,
} from 'class-validator';

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

  @IsEnum(['staff', 'admin'])
  role!: 'staff' | 'admin';
}
