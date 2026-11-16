import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PlayersModule } from 'src/players/players.module';
import { AuthService } from './providers/auth.service';
import { AuthController } from './controllers/auth.controller';

@Module({
    imports: [
        PlayersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: { expiresIn: '90d' },
            })
        })
    ],
    providers: [ AuthService ],
    controllers: [ AuthController ],
    exports: [ AuthService ],
})
export class AuthModule {}
