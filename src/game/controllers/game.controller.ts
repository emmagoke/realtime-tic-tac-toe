import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GameService } from '../providers/game.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlayerId } from 'src/auth/decorators/player-id.decorator';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':code/replay')
  replay(@Param('code') code: string) {
    return this.gameService.getReplay(code);
  }

  @Get('mine')
  mine(@PlayerId() playerId: string) {
    return this.gameService.listMyGames(playerId);
  }
}
