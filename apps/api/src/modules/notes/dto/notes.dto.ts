import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
