import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateDocumentRequestStatusDto {
  // Only the status can be updated (mark as received)
  // Value is always 'received' — no body field needed, but keeping a DTO for symmetry
}
