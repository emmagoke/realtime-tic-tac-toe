import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
    Unique
} from 'typeorm';
import type { Mark } from '../types/game.types';
import { Game } from './game.entity';
import { Player } from 'src/players/enitities/player.entity';
// import { Player } from './players/entities/player.entity';

@Entity('game_players')
@Unique(['gameId', 'playerId'])
@Unique(['gameId', 'mark'])
export class GamePlayer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid')
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column('uuid')
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column({ type: 'varchar', length: 1 })
  mark: Mark;
}
