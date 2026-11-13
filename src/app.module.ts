import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import {ConfigService} from '@nestjs/config';

import { GameModule } from './game/game.module';
import { buildDataSourceOptions } from './database/typeorm.config';
import { PlayersModule } from './players/players.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    GameModule,
    TypeOrmModule.forRootAsync({
       inject: [ConfigService],
       useFactory: (config: ConfigService) =>  
        buildDataSourceOptions(
          config.getOrThrow<string>('DATABASE_URL'),
          config.get('DB_SSL') === 'true',
        ),
    }),
    PlayersModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
