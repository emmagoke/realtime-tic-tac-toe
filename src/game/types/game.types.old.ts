export type Mark = 'X' | 'O';
export type Cell = Mark | '';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;      // socket id
  mark: Mark;
}

export interface Game {
  id: string;                      // room code players share
  board: Cell[];
  players: Player[];               // 1 while waiting, 2 when playing
  currentTurn: Mark;
  status: GameStatus;
  winner: Mark | 'tie' | null;
  winningLine: number[] | null;
  scores: { X: number; O: number; tie: number };
}
