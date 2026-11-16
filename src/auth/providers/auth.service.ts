import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from "@nestjs/typeorm";
import { Player } from "src/players/enitities/player.entity";
import { Repository } from "typeorm";

@Injectable()
export class AuthService {
    constructor (
        private readonly jwtService: JwtService,
        @InjectRepository(Player)
        private readonly players: Repository<Player>,
    ) {}

    /** Returns the player id, or throws if the token is missing, forged, expired or unknown. */
    async verify(token?: string): Promise<string> {
        if (!token) throw new UnauthorizedException();
        let payload: { sub: string };

        try {
            payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
        } catch (error) {
            throw new UnauthorizedException(error);
        }

        if (!(await this.players.existsBy({ id: payload.sub }))) 
                throw new UnauthorizedException();
        
        return payload.sub;
    }
}
