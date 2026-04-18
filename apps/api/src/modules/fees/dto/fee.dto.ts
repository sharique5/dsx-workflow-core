import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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
}
