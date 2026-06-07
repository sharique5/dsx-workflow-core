import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai.dto';

@UseGuards(JwtAuthGuard)
@Controller('portal/ai')
export class AiController {
  constructor(private aiService: AiService) {}

  /** POST /api/v1/portal/ai/chat */
  @Post('chat')
  chat(@Body() dto: AiChatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.chat(dto.question, user);
  }
}
