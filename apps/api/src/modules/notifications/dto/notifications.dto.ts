import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';

export enum NotificationChannelDto {
  email = 'email',
  whatsapp = 'whatsapp',
}

export class SendNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  matterId!: string;

  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

  @IsEnum(NotificationChannelDto)
  channel!: NotificationChannelDto;

  /** Either templateId OR customMessage must be provided */
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  customMessage?: string;
}

export class CreateReminderDto {
  @IsUUID()
  @IsNotEmpty()
  scheduledEventId!: string;

  /** ISO-8601 datetime — when to send the reminder */
  @IsString()
  @IsNotEmpty()
  remindAt!: string;
}
