import { Module } from "@nestjs/common";
import { GameGateway } from "./game.gateway";
import { GameService } from "./providers/game.service";

@Module({
    providers: [
        GameGateway, GameService
    ],
})
export class GameModule{}
