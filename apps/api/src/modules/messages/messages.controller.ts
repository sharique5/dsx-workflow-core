import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/messages.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters/:matterId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  /** GET /api/v1/matters/:matterId/messages */
  @Get()
  findAll(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.findAll(matterId, user);
  }

  /** POST /api/v1/matters/:matterId/messages */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.create(matterId, dto, user);
  }

  /** PATCH /api/v1/matters/:matterId/messages/read */
  @Patch('read')
  markRead(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.markRead(matterId, user);
  }

  /** GET /api/v1/matters/:matterId/messages/unread */
  @Get('unread')
  unreadCount(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.unreadCount(matterId, user);
  }
}
