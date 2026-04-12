import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // email or phone
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
