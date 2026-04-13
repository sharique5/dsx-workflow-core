import { Module } from '@nestjs/common';
import { MattersController } from './matters.controller';
import { MattersService } from './matters.service';

@Module({
  controllers: [MattersController],
  providers: [MattersService],
})
export class MattersModule {}
