import { Module } from '@nestjs/common';
import { Player } from './enitities/player.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forFeature([Player])
    ],
    providers: [],
    controllers: [],
    exports: [TypeOrmModule]
})
export class PlayersModule {}
