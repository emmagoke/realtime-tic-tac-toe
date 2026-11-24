import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const PlayerId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest().playerId,
);
