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
import { MattersService } from './matters.service';
import { CreateMatterDto, UpdateMatterDto } from './dto/matters.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters')
@UseGuards(JwtAuthGuard)
export class MattersController {
  constructor(private mattersService: MattersService) {}

  /** GET /api/v1/matters */
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.mattersService.findAll(user);
  }

  /** GET /api/v1/matters/:id */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mattersService.findOne(id, user);
  }

  /** POST /api/v1/matters */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMatterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mattersService.create(dto, user);
  }

  /** PATCH /api/v1/matters/:id */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMatterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mattersService.update(id, dto, user);
  }

  /** PATCH /api/v1/matters/:id/close */
  @Patch(':id/close')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mattersService.close(id, user);
  }

  /** DELETE /api/v1/matters/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mattersService.remove(id, user);
  }
}
