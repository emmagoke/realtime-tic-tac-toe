import { Injectable } from "@nestjs/common";
import { WsException } from '@nestjs/websockets';
import { Game, Mark } from '../game.types';

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

@Injectable()
export class GameService {
    private games = new Map<string, Game>();
    private playerToGame = new Map<string, string>(); // socketId -> gameId

    createGame(playerId: string): { game: Game; mark: Mark } {
        this.removePlayer(playerId); // leave any previous game first

        const game: Game = {
        id: this.generateCode(),
        board: Array(9).fill(''),
        players: [{ id: playerId, mark: 'X' }],
        currentTurn: 'X',
        status: 'waiting',
        winner: null,
        winningLine: null,
        scores: { X: 0, O: 0, tie: 0 },
        };
        this.games.set(game.id, game);
        this.playerToGame.set(playerId, game.id);
        return { game, mark: 'X' };
    }

    joinGame(gameId: string, playerId: string): { game: Game; mark: Mark } {
        const game = this.games.get(gameId.toUpperCase());
        if (!game) throw new WsException('Game not found');
        if (game.players.length >= 2) throw new WsException('Game is full');
        if (game.players.some((p) => p.id === playerId)) {
        throw new WsException('You are already in this game');
        }

        this.removePlayer(playerId);
        game.players.push({ id: playerId, mark: 'O' });
        game.status = 'playing';
        this.playerToGame.set(playerId, game.id);
        return { game, mark: 'O' };
    }

    makeMove(playerId: string, index: number): Game {
        const game = this.getGameOrThrow(playerId);
        const player = game.players.find((p) => p.id === playerId)!;

        if (game.status !== 'playing') throw new WsException('Game is not active');
        if (player.mark !== game.currentTurn) throw new WsException('Not your turn');
        if (!Number.isInteger(index) || index < 0 || index > 8) {
        throw new WsException('Invalid cell');
        }
        if (game.board[index] !== '') throw new WsException('Cell already taken');

        game.board[index] = player.mark;

        const line = WIN_PATTERNS.find(
        ([a, b, c]) =>
            game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c],
        );

        if (line) {
        game.status = 'finished';
        game.winner = player.mark;
        game.winningLine = line;
        game.scores[player.mark]++;
        } else if (game.board.every((c) => c !== '')) {
        game.status = 'finished';
        game.winner = 'tie';
        game.scores.tie++;
        } else {
        game.currentTurn = player.mark === 'X' ? 'O' : 'X';
        }
        return game;
    }

    rematch(playerId: string): Game {
        const game = this.getGameOrThrow(playerId);
        if (game.status !== 'finished') throw new WsException('Game is not finished');
        game.board = Array(9).fill('');
        game.currentTurn = 'X';
        game.status = 'playing';
        game.winner = null;
        game.winningLine = null;
        return game;
    }

    resetScores(playerId: string): Game {
        const game = this.getGameOrThrow(playerId);
        game.scores = { X: 0, O: 0, tie: 0 };
        return game;
    }

    /** Called on disconnect or when a player leaves. Returns the game if it still exists. */
    removePlayer(playerId: string): Game | null {
        const gameId = this.playerToGame.get(playerId);
        if (!gameId) return null;
        this.playerToGame.delete(playerId);

        const game = this.games.get(gameId);
        if (!game) return null;

        game.players = game.players.filter((p) => p.id !== playerId);
        if (game.players.length === 0) {
        this.games.delete(gameId);
        return null;
        }

        // The remaining player waits for a new opponent; restart the round
        game.status = 'waiting';
        game.board = Array(9).fill('');
        game.currentTurn = 'X';
        game.winner = null;
        game.winningLine = null;
        return game;
    }

    private getGameOrThrow(playerId: string): Game {
        const gameId = this.playerToGame.get(playerId);
        const game = gameId && this.games.get(gameId);
        if (!game) throw new WsException('You are not in a game');
        return game;
    }

    private generateCode(): string {
        let code: string;
        do {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
        } while (this.games.has(code));
        return code;
    }
}
