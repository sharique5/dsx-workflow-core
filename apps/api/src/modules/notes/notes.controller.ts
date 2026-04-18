import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters/:matterId/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  /** GET /api/v1/matters/:matterId/notes */
  @Get()
  findAll(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.findAll(matterId, user);
  }

  /** POST /api/v1/matters/:matterId/notes */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.create(matterId, dto, user);
  }

  /** PATCH /api/v1/matters/:matterId/notes/:id */
  @Patch(':id')
  update(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.update(matterId, id, dto, user);
  }

  /** DELETE /api/v1/matters/:matterId/notes/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.remove(matterId, id, user);
  }
}
