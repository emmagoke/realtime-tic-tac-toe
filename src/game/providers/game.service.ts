import { Injectable } from "@nestjs/common";
import { WsException } from '@nestjs/websockets';
import { GameState, Mark } from '../types/game.types';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Player } from "src/players/enitities/player.entity";
import { GamePlayer } from "../entities/game-player.entity";

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class GameService {
    private games = new Map<string, Game>();
    private playerToGame = new Map<string, string>(); // socketId -> gameId

    constructor (
        @InjectRepository(Player)
        private readonly players: Repository<Player>,
        @InjectRepository(GamePlayer)
        private readonly gamePlayers: Repository<GamePlayer>,

    ) {}

    //#TODO: there is a bug, if I keep identitfy it keep creating players
    /** Find the player by id, or create a new one. */
    async identify (playerId?: string) : Promise<Player> {
        if (playerId && UUID_RE.test(playerId)) {
            const existing = await this.players.findOneBy(
                {id: playerId}
            )
            if (existing) return existing;
        }
        return this.players.save(this.players.create())
    }

    //#TODO: Can a player have more than One active game
    /** Most recent game this player belongs to (for rejoining after refresh). */
    async findActiveGame (playerId: string): Promise <{
        state: GameState; mark: Mark} | null> {
            const gamePlayer= await this.gamePlayers
                .createQueryBuilder("gp")
                .innerJoinAndSelect("gp.game", "g")
                .where("gp.playerId = :playerId", {playerId})
                .orderBy("g.createdAt", "DESC")
                .getOne()
            
            if (!gamePlayer) return null;

            return {
                state: await this.getState(gamePlayer.game.code),
                mark: gamePlayer.mark
            }
        }

    async createGame(playerId: string): Promise<{ state: GameState; mark: Mark }> {
        const code = await this.dataSource.transaction(
            async (m) => {
                const game = await m.save(
                    m.create(
                        Game, {code: await this.generateCode(m)}
                    )
                );
                await m.save(
                    m.create(
                        GamePlayer, { gameId: game.id, playerId, mark: 'X' }
                    )
                );

                return game.code;
            }
        )

        return { 
            state: await this.getState(code),
            mark: 'X'
        };
    }

     async joinGame(rawCode: string, playerId: string): Promise<{ state: GameState; mark: Mark }> {
        const code = (rawCode ?? '').trim().toUpperCase();

        return this.dataSource.transaction (
            async (m) => {
                const { game, players } = await this.load(m, code, true);

                const existing = players.find((p) => p.playerId === playerId);
                if (existing) return { state: this.toState(game, players), mark: existing.mark }; // rejoin
                
                if (players.length >= 2) throw new WsException('Game is full');

                const mark: Mark = players[0].mark === 'X' ? 'O' : 'X';
                const gp = await m.save(
                    m.create(
                        GamePlayer, { gameId: game.id, playerId, mark }
                    )
                );
                players.push(gp);
                game.status = 'playing';
                await m.save(game);
                return {
                    state: this.toState(game, players),
                    mark
                };
            }
        )
    }

    makeMove(code: string, playerId: string, index: number): Promise<GameState> {
        return this.mutate(
            code, playerId, (game, me) => {
                if (game.status !== 'playing') throw new WsException('Game is not active');
                if (me.mark !== game.currentTurn) throw new WsException('Not your turn');
                if (!Number.isInteger(index) || index < 0 || index > 8) {
                    throw new WsException('Invalid cell');
                }

                if (game.board[index] !== '') throw new WsException('Cell already taken');

                const board = [...game.board];
                board[index] = me.mark;
                game.board = board;

                const line = WIN_PATTERNS.find(
                    ([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c],
                );

                if (line) {
                    game.status = 'finished';
                    game.winner = me.mark;
                    game.winningLine = line;
                    if (me.mark === 'X') game.scoreX++;
                    else game.scoreO++;
                } else if (board.every((c) => c !== '')) {
                    game.status = 'finished';
                    game.winner = 'tie';
                    game.scoreTie++;
                } else {
                    game.currentTurn = me.mark === 'X' ? 'O' : 'X';
                }
            }
        )
    }

    rematch(code: string, playerId: string): Promise<GameState> {
        return this.mutate(
            code, playerId, (game) => {
                if (game.status !== 'finished') throw new WsException('Game is not finished');
                game.board = Array(9).fill('');
                game.currentTurn = 'X';
                game.status = 'playing';
                game.winner = null;
                game.winningLine = null;
            }
        )
    }

    resetScores(code: string, playerId: string): Promise<GameState> {
        return this.mutate(
            code, playerId, (game) => {
                game.scoreX = 0;
                game.scoreO = 0;
                game.scoreTie = 0;
            }
        )
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

    async getState(code: string): Promise<GameState> {
        const { game, players } = await this.load(
            this.dataSource.manager, code
        )

        return this.toState(game, players)
    }

    private mutate (
        code: string,
        playerId: string,
        fn: (game: Game, me: GamePlayer) => void,
    ): Promise<GameState> {
        return this.dataSource.transaction(
            async (m) => {
                const { game, players } = await this.load(m, code, true);
                const me = players.find((p) => p.playerId === playerId);
                if (!me) throw new WsException('You are not in this game');

                fn(game, me);
                await m.save(game);
                return this.toState(game, players);
            }
        )
    }

    private getGameOrThrow(playerId: string): Game {
        const gameId = this.playerToGame.get(playerId);
        const game = gameId && this.games.get(gameId);
        if (!game) throw new WsException('You are not in a game');
        return game;
    }

    private async load (m: EntityManager, code: string, lock = false) {
        const game = await m.findOne(Game, {
            where: {code},
            lock: lock ? { mode: 'pessimistic_write' as const} : undefined
        })

        if (!game) throw new WsException('Game not found');
        const players = await m.find(GamePlayer, {
            where: { gameId: game.id}
        });

        return {game, players}
    }

    private async generateCode(m: EntityManager): Promise<string>  {
        for (;;) {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            if (code.length === 4 && !(await m.exists(Game, { where: { code } }))) return code;
        }
    }

}
