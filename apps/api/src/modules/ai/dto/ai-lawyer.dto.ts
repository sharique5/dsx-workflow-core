import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AiLawyerChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;
}
