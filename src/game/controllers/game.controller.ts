import { Controller, Get, Param } from '@nestjs/common';
import { GameService } from '../providers/game.service';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get(':code/replay')
  replay(@Param('code') code: string) {
    return this.gameService.getReplay(code);
  }
}
