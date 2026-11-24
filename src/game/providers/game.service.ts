import { Injectable, NotFoundException } from "@nestjs/common";
import { WsException } from '@nestjs/websockets';
import type { Cell, GameState, Mark } from '../types/game.types';
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Player } from "src/players/enitities/player.entity";
import { GamePlayer } from "../entities/game-player.entity";
import { Game } from '../entities/game.entity';
import { Round } from "../entities/round.entity";
import { Move } from "../entities/move.entity";

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
        private readonly dataSource: DataSource,

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
                        Game, {
                            code: await this.generateCode(m),
                            board: Array(9).fill('') as Cell[],
                        }
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

    /** Deliberate leave = abandon. Accidental disconnects never call this. */
    leaveGame(code: string, playerId: string): Promise<GameState> {
        return this.mutate(code, playerId, (game) => {
            game.status = 'abandoned';
        });
    }

    async getReplay(rawCode: string) {
        const m = this.dataSource.manager;
        const game = await m.findOneBy(
            Game, { code: rawCode.trim().toUpperCase() }
        );
        if (!game) throw new NotFoundException('Game not found');

        const players = await m.find(
            GamePlayer, { where: { gameId: game.id } }
        );
        const rounds = await m.find(
            Round, { where: { gameId: game.id }, order: { roundNumber: 'ASC' } });
        const moves = rounds.length
        ? await m.find(Move, { where: { roundId: In(rounds.map((r) => r.id)) }, order: { moveNumber: 'ASC' } })
        : [];

        return {
            code: game.code,
            players: players.map((p) => ({ mark: p.mark })),
            rounds: rounds.map((r) => ({
                roundNumber: r.roundNumber,
                winner: r.isTie ? 'tie' : (players.find((p) => p.playerId === r.winnerId)?.mark ?? null),
                winningLine: r.winningLine,
                moves: moves
                .filter((mv) => mv.roundId === r.id)
                .map((mv) => ({ moveNumber: mv.moveNumber, mark: mv.mark, cellIndex: mv.cellIndex })),
            })),
        };
    }

    /** The caller's most recent games, for the "My games" list. */
    async listMyGames(playerId: string) {
        const rows = await this.gamePlayers
            .createQueryBuilder('gp')
            .innerJoinAndSelect('gp.game', 'g')
            .where('gp.playerId = :playerId', { playerId })
            .orderBy('g.createdAt', 'DESC')
            .take(20)
            .getMany();

        return rows.map((gp) => ({
            code: gp.game.code,
            status: gp.game.status,
            myMark: gp.mark,
            scores: { X: gp.game.scoreX, O: gp.game.scoreO, tie: gp.game.scoreTie },
            createdAt: gp.game.createdAt,
        }));
    }


    async getState(code: string): Promise<GameState> {
        const { game, players } = await this.load(
            this.dataSource.manager, code
        )

        return this.toState(game, players)
    }

    private async startRound(m: EntityManager, gameId: string): Promise<Round> {
        const last = await m.findOne(
            Round, { where: { gameId }, order: { roundNumber: 'DESC' } }
        );
        return m.save(
            m.create(Round, { gameId, roundNumber: (last?.roundNumber ?? 0) + 1 })
        );
    }

    private async currentRound(m: EntityManager, gameId: string): Promise<Round> {
        const round = await m.findOne(
            Round, { where: { gameId }, order: { roundNumber: 'DESC' } }
        );
        if (!round) throw new WsException('No active round');
        return round;
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

    private toState(game: Game, players: GamePlayer[]): GameState  {
        return {
            id: game.code,
            board: game.board,
            players: players.map((p) => ({ mark: p.mark })),
            currentTurn: game.currentTurn,
            status: game.status,
            winner: game.winner,
            winningLine: game.winningLine,
            scores: { X: game.scoreX, O: game.scoreO, tie: game.scoreTie },   
        }
    }
}
