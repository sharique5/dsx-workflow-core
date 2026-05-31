import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsISO8601,
  Min,
} from 'class-validator';
import { FeeType } from '@prisma/client';

export class CreateFeeDto {
  @IsEnum(FeeType)
  type!: FeeType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount!: number;
}

export class LogPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;

  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}
