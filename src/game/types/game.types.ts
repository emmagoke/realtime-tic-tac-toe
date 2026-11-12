export type Mark = 'X' | 'O';
export type Cell = Mark | '';
export type GameStatus = 'waiting' | 'playing' | 'finished';

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
