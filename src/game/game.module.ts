import { Module } from "@nestjs/common";
import { GameGateway } from "./game.gateway";
import { GameService } from "./providers/game.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Game } from "./entities/game.entity";
import { GamePlayer } from "./entities/game-player.entity";
import { PlayersModule } from "src/players/players.module";
import { GameController } from "./controllers/game.controller";
import { AuthModule } from "src/auth/auth.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Game, GamePlayer]),
        PlayersModule, AuthModule
    ],
    providers: [
        GameGateway, GameService
    ],
    controllers: [ GameController ]
})
export class GameModule{}
