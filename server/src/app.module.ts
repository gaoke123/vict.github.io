import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { StockModule } from './stock/stock.module';
import { DataModule } from './data/data.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, AdminModule, StockModule, DataModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
