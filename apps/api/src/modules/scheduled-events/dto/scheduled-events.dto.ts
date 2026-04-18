import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateScheduledEventDto {
  @IsDateString()
  scheduledAt!: string;

  @IsString()
  @IsOptional()
  outcomeNotes?: string;
}

export class UpdateScheduledEventDto {
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  outcomeNotes?: string;
}
