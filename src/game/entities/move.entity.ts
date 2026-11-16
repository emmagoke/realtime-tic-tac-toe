import {
    Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
    PrimaryGeneratedColumn, Unique
} from 'typeorm';
import type { Mark } from '../types/game.types';
import { Round } from './round.entity';
import { Player } from 'src/players/enitities/player.entity';


@Entity('moves')
@Unique(['roundId', 'moveNumber'])
@Unique(['roundId', 'cellIndex'])
export class Move {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid')
  roundId: string;

  @ManyToOne(() => Round, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: Round;

  @Column('uuid')
  playerId: string;
  
  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @Column({ type: 'varchar', length: 1 })
  mark: Mark;

  @Column('int')
  moveNumber: number;

  @Column('int')
  cellIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
