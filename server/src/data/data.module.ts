import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { AdminService } from '../admin/admin.service';

@Module({
  controllers: [DataController],
  providers: [AdminService],
})
export class DataModule {}
