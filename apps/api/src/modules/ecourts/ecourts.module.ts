import { Module } from '@nestjs/common';
import { EcourtsController } from './ecourts.controller';
import { EcourtsService } from './ecourts.service';
import { EcourtsSyncScheduler } from './ecourts.scheduler';
import { EcourtsFeatureGuard } from './guards/ecourts-feature.guard';
import { ECOURTS_PROVIDER } from './providers/ecourts-provider.interface';
import { EcourtsIndiaProvider } from './providers/ecourtsindia.provider';

@Module({
  controllers: [EcourtsController],
  providers: [
    EcourtsService,
    EcourtsSyncScheduler,
    EcourtsFeatureGuard,
    { provide: ECOURTS_PROVIDER, useClass: EcourtsIndiaProvider },
  ],
  exports: [EcourtsService],
})
export class EcourtsModule {}
