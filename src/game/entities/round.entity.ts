import { 
    Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
    PrimaryGeneratedColumn, Unique
} from 'typeorm';
import { Game } from './game.entity';
import { Player } from 'src/players/enitities/player.entity';


@Entity('rounds')
@Unique(['gameId', 'roundNumber'])
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  gameId: string;
  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column('int')
  roundNumber: number;

  @Column({ type: 'uuid', nullable: true })
  winnerId: string | null;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winnerId' })
  winner: Player | null;

  @Column({ type: 'boolean', default: false })
  isTie: boolean;

  @Column({ type: 'jsonb', nullable: true })
  winningLine: number[] | null;

  @CreateDateColumn()
  startedAt: Date;
  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
