import { EntityManager } from "typeorm";
import { GamePlayer } from "../entities/game-player.entity";
import { Game } from "../entities/game.entity";

export type Mark = 'X' | 'O';
export type Cell = Mark | '';
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';

export interface GameState {
  id: string; // the 4-letter room code
  board: Cell[];
  players: { mark: Mark }[];
  currentTurn: Mark;
  status: GameStatus;
  winner: Mark | 'tie' | null;
  winningLine: number[] | null;
  scores: { X: number; O: number; tie: number };
}

export type MutationCtx = { game: Game; me: GamePlayer; m: EntityManager };
