import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;
}
