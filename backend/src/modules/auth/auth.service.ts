import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';

// Argon2 options - reduced for faster login (trade-off: slightly less secure)
// Default: timeCost=3, memoryCost=65536 (64MB)
// Current: timeCost=2, memoryCost=16384 (16MB) - ~4x faster
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  timeCost: 2,
  memoryCost: 16384,
  parallelism: 1,
};

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
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['role', 'company'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      password,
      ARGON2_OPTIONS,
    );
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

    // Transparent re-hash: if old hash uses higher cost, re-hash with new lower cost
    // This makes subsequent logins faster
    if (this.needsRehash(user.passwordHash)) {
      const newHash = await this.hashPassword(loginDto.password);
      await this.userRepository.update(user.id, {
        passwordHash: newHash,
        lastLogin: new Date(),
      });
    } else {
      // Update last login only
      await this.userRepository.update(user.id, { lastLogin: new Date() });
    }

    return this.generateTokens(user);
  }

  /**
   * Check if password hash needs re-hashing with new cost parameters
   * Argon2 hash format: $argon2id$v=19$m=65536,t=3,p=1$salt$hash
   * We check if memoryCost (m) is higher than our current setting
   */
  private needsRehash(hash: string): boolean {
    try {
      // Extract memory cost from hash string
      const match = hash.match(/m=(\d+)/);
      if (match) {
        const currentMemoryCost = parseInt(match[1], 10);
        return currentMemoryCost > ARGON2_OPTIONS.memoryCost!;
      }
      return false;
    } catch {
      return false;
    }
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
    return argon2.hash(password, ARGON2_OPTIONS);
  }
}
