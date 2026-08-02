import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsISO8601,
  Min,
} from 'class-validator';
import { FeeType, BillingCycle } from '@prisma/client';

export class CreateFeeDto {
  @IsEnum(FeeType)
  type!: FeeType;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

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

export class CreateRazorpayOrderDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;
}

export class VerifyRazorpayPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpay_order_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_payment_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}
