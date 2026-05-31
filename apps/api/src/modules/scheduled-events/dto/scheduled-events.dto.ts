import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateScheduledEventDto {
  @IsDateString()
  scheduledAt!: string;

  @IsString()
  @IsOptional()
  outcomeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  courtLink?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  judgeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  lawyerNotes?: string;
}

export class UpdateScheduledEventDto {
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  outcomeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  courtLink?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  judgeNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  lawyerNotes?: string;
}
