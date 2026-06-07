import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { AiLawyerService } from './ai-lawyer.service';
import { AiChatDto } from './dto/ai.dto';
import { AiLawyerChatDto } from './dto/ai-lawyer.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AiController {
  constructor(
    private aiService: AiService,
    private aiLawyerService: AiLawyerService,
  ) {}

  /** POST /api/v1/portal/ai/chat — client portal */
  @Post('portal/ai/chat')
  chat(@Body() dto: AiChatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.chat(dto.question, user);
  }

  /** POST /api/v1/ai/lawyer-chat — lawyer/admin only */
  @Post('ai/lawyer-chat')
  lawyerChat(@Body() dto: AiLawyerChatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.aiLawyerService.chat(dto.question, user);
  }
}
