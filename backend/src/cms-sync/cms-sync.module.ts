import { Module } from '@nestjs/common';
import { CmsSyncService } from './cms-sync.service';
import { CmsSyncController } from './cms-sync.controller';
import { StrapiClientService } from './strapi-client.service';

@Module({
  controllers: [CmsSyncController],
  providers: [CmsSyncService, StrapiClientService],
  exports: [CmsSyncService, StrapiClientService],
})
export class CmsSyncModule {}
