import {
    BaseWsExceptionFilter,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './providers/game.service';
import { GameState, Mark } from './types/game.types';
import { AuthService } from 'src/auth/providers/auth.service';
import { Logger, UseFilters } from '@nestjs/common';

@UseFilters(new BaseWsExceptionFilter())
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(GameGateway.name);

    constructor(
        private readonly gameService: GameService,
        private readonly authService: AuthService,
    ) {}

    /** Runs for every handshake, before the socket is connected. */
    afterInit(server: Server) {
        server.use(async (socket, next) => {
            try {
                socket.data.playerId = await this.authService.verify(
                    socket.handshake.auth?.token
                );
                next();
            } catch {
                next(new Error('unauthorized'));
            }
        });
    }

    // async handleConnection(client: Socket) {
    //     try {
    //         const sent = client.handshake.auth?.playerId;
    //         const player = await this.gameService.identify(sent);
    //         console.log(`PlayerId on handle connection:  ${sent}`)

    //          console.log(
    //             `socket ${client.id} sent=${sent} resolved=${player.id} ` +
    //                 `${sent === player.id ? 'existing' : 'REPLACED'} ` +
    //                 `referer=${client.handshake.headers.referer ?? client.handshake.headers.origin} ` +
    //                 `ua=${client.handshake.headers['user-agent']?.slice(0, 40)}`,
    //         );

    //         client.data.playerId = player.id;
    //         client.emit('identity', { playerId: player.id });

    //         const active = await this.gameService.findActiveGame(player.id);
    //         if (active) this.enter(client, active.state, active.mark);
    //     } catch (error) {
    //         client.disconnect();
    //     }
    // }

    /** The player is already authenticated here: put them back into their game, if any. */
    async handleConnection(client: Socket) {
        try {
            client.emit('ready', { playerId: client.data.playerId });
            const active = await this.gameService.findActiveGame(client.data.playerId);
            if (active) this.enter(client, active.state, active.mark);
        } catch (err) {
            this.logger.error('handleConnection failed', err as Error);
        }
    }

    @SubscribeMessage('createGame')
    async handleCreate(@ConnectedSocket() client: Socket) {
        const { state, mark } = await this.gameService.createGame(client.data.playerId);
        this.enter(client, state, mark);
    }

    @SubscribeMessage('joinGame')
    async handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { gameId: string },
    ) {
        const { state, mark } = await this.gameService.joinGame(body.gameId, client.data.playerId);
        console.log(`PlayerId: ${client.data.playerId}`)
        this.enter(client, state, mark);
    }

    @SubscribeMessage('makeMove')
    async handleMove(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { index: number },
    ) {
        console.log('makeMove body:', JSON.stringify(body), typeof body?.index);
        const { playerId, code } = this.ctx(client);
        this.broadcast(await this.gameService.makeMove(code, playerId, body.index));
    }

    @SubscribeMessage('rematch')
    async handleRematch(@ConnectedSocket() client: Socket) {
        const { playerId, code } = this.ctx(client);
        this.broadcast(await this.gameService.rematch(code, playerId));
    }

    @SubscribeMessage('resetScores')
    async handleResetScores(@ConnectedSocket() client: Socket) {
        const { playerId, code } = this.ctx(client);
        this.broadcast(await this.gameService.resetScores(code, playerId));
    }

    @SubscribeMessage('leaveGame')
        async handleLeave(@ConnectedSocket() client: Socket) {
        const { playerId, code } = this.ctx(client);
        const state = await this.gameService.leaveGame(code, playerId);
        client.leave(code);
        client.data.gameCode = undefined;
        client.emit('left');
        this.broadcast(state);
    }


    private enter(client: Socket, state: GameState, mark: Mark) {
        if (client.data.gameCode && client.data.gameCode !== state.id) {
            client.leave(client.data.gameCode);
        }
        client.data.gameCode = state.id;
        client.join(state.id);
        client.emit('joined', { gameId: state.id, mark });
        this.broadcast(state);
    }

    private ctx(client: Socket) {
        if (!client.data.gameCode) throw new WsException('You are not in a game');
        return { 
            playerId: client.data.playerId as string,
            code: client.data.gameCode as string 
        };
    }

    private broadcast(state: GameState) {
        this.server.to(state.id).emit('gameState', state);
    }
}
