import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  AcceptInviteDto,
  LoginPasswordDto,
  SetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** POST /api/v1/auth/request-otp */
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  /** POST /api/v1/auth/verify-otp */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto);

    // Set JWT as httpOnly cookie (primary) — also return in body for API clients
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /** POST /api/v1/auth/accept-invite — validate invite token, log client in */
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.acceptInvite(dto);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user, accessToken: result.accessToken };
  }

  /** POST /api/v1/auth/logout */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logged out' };
  }

  /** GET /api/v1/auth/me */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  /** POST /api/v1/auth/login-password — email + password sign-in */
  @Post('login-password')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(
    @Body() dto: LoginPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithPassword(dto);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user, accessToken: result.accessToken };
  }

  /** PATCH /api/v1/auth/me/password — set or change own password (requires JWT) */
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetPasswordDto,
  ) {
    return this.authService.setPassword(user.id, dto);
  }

  /** PATCH /api/v1/auth/me/password/clear — remove password, force OTP-only (requires JWT) */
  @Patch('me/password/clear')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  clearPassword(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.clearPassword(user.id);
  }
}

