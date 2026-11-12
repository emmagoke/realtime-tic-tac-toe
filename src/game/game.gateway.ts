import {
  ConnectedSocket, MessageBody, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './providers/game.service';
import { Game } from './types/game.types.old';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection {
    @WebSocketServer() server!: Server;

    constructor(private readonly gameService: GameService) {}

    async handleConnection(client: Socket) {
        try {
            const player = await this.gameService.identify(client.handshake.auth?.playerId);
            client.data.playerId = player.id;
            client.emit('identity', { playerId: player.id });

            const active = await this.gameService.findActiveGame(player.id);
            if (active) this.enter(client, active.state, active.mark);
        } catch (error) {
            client.disconnect();
        }
    }

    @SubscribeMessage('createGame')
    handleCreate(@ConnectedSocket() client: Socket) {
        const { game, mark } = this.gameService.createGame(client.id);
        client.join(game.id);
        client.emit('joined', { gameId: game.id, mark });
        this.broadcast(game);
    }

    @SubscribeMessage('joinGame')
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { gameId: string },
    ) {
        const { game, mark } = this.gameService.joinGame(body.gameId, client.id);
        client.join(game.id);
        client.emit('joined', { gameId: game.id, mark });
        this.broadcast(game);
    }

    @SubscribeMessage('makeMove')
    handleMove(
        @ConnectedSocket() client: Socket,
        @MessageBody() body: { index: number },
    ) {
        this.broadcast(this.gameService.makeMove(client.id, body.index));
    }

    @SubscribeMessage('rematch')
    handleRematch(@ConnectedSocket() client: Socket) {
        this.broadcast(this.gameService.rematch(client.id));
    }

    @SubscribeMessage('resetScores')
    handleResetScores(@ConnectedSocket() client: Socket) {
        this.broadcast(this.gameService.resetScores(client.id));
    }

    handleDisconnect(client: Socket) {
        const game = this.gameService.removePlayer(client.id);
        if (game) this.broadcast(game);
    }

    private broadcast(game: Game) {
        this.server.to(game.id).emit('gameState', game);
    }
}
