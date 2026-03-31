import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ContentModule } from './content/content.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TagModule } from './tag/tag.module';
import { CacheModule } from './cache/cache.module';
import { CmsSyncModule } from './cms-sync/cms-sync.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    CacheModule,
    AuthModule,
    UserModule,
    ContentModule,
    SubscriptionModule,
    TagModule,
    CmsSyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
