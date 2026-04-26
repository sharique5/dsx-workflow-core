import { IsString, IsNotEmpty, Length, IsEmail, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

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

export class LoginPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

