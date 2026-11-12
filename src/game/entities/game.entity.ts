import { 
    Column, CreateDateColumn, Entity, PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import type { Cell, GameStatus, Mark } from '../game.types';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 4, unique: true })
  code: string;

  @Column({ type: 'jsonb', default: () => `'["","","","","","","","",""]'` })
  board: Cell[];

  @Column({ type: 'varchar', length: 1, default: 'X' })
  currentTurn: Mark;

  @Column({ type: 'varchar', default: 'waiting' })
  status: GameStatus;

  @Column({ type: 'varchar', nullable: true })
  winner: Mark | 'tie' | null;

  @Column({ type: 'jsonb', nullable: true })
  winningLine: number[] | null;

  @Column({ type: 'int', default: 0 }) scoreX: number;
  @Column({ type: 'int', default: 0 }) scoreO: number;
  @Column({ type: 'int', default: 0 }) scoreTie: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
