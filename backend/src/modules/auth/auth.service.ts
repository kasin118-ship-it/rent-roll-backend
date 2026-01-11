import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
    sub: string;
    email: string;
    companyId: string;
    role: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { email, isActive: true },
            relations: ['role', 'company'],
        });

        if (!user) {
            return null;
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, password);
        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async login(loginDto: LoginDto): Promise<AuthTokens> {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.userRepository.update(user.id, { lastLogin: new Date() });

        return this.generateTokens(user);
    }

    async refreshTokens(refreshToken: string): Promise<AuthTokens> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.userRepository.findOne({
                where: { id: payload.sub, isActive: true },
                relations: ['role', 'company'],
            });

            if (!user) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            return this.generateTokens(user);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private generateTokens(user: User): AuthTokens {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            companyId: user.companyId,
            role: user.role.name,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        });

        return { accessToken, refreshToken };
    }

    async hashPassword(password: string): Promise<string> {
        return argon2.hash(password);
    }
}
