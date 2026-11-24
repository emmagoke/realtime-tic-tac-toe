import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "../providers/auth.service";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor (
        private readonly auth: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean>{
        const req = context.switchToHttp().getRequest();
        const header: string | undefined = req.headers.authorization;
        const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
        req.playerId = await this.auth.verify(token); // throws 401 if invalid
        return true;
    }
}
