import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Rank, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };

  const user: User = {
    id: 'user-1',
    email: 'player@example.com',
    username: 'ArenaPlayer',
    passwordHash: 'hashed-password',
    role: Role.USER,
    avatar: null,
    level: 1,
    xp: 0,
    rank: Rank.BRONZE,
    wins: 0,
    losses: 0,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(async (_payload, options) =>
        options.secret === 'test-access-token-secret-for-unit-tests'
          ? 'access-token'
          : 'refresh-token',
      ),
      verifyAsync: jest.fn(),
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          BCRYPT_SALT_ROUNDS: 10,
          JWT_ACCESS_TOKEN_SECRET: 'test-access-token-secret-for-unit-tests',
          JWT_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-for-unit-tests',
          JWT_ACCESS_TOKEN_TTL: '15m',
          JWT_REFRESH_TOKEN_TTL: '7d',
        };

        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user, hashes the password, and stores a refresh token', async () => {
    prisma.user.create.mockResolvedValue(user);
    prisma.refreshToken.create.mockResolvedValue({
      id: 'refresh-token-1',
      tokenHash: 'token-hash',
      userId: user.id,
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await service.register({
      email: 'PLAYER@EXAMPLE.COM',
      username: 'ArenaPlayer',
      password: 'StrongPass123',
    });

    const createUserCall = prisma.user.create.mock.calls[0][0];

    expect(createUserCall.data.email).toBe('player@example.com');
    expect(createUserCall.data.username).toBe('ArenaPlayer');
    expect(createUserCall.data.passwordHash).not.toBe('StrongPass123');
    await expect(
      bcrypt.compare('StrongPass123', createUserCall.data.passwordHash),
    ).resolves.toBe(true);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: expect.any(String),
        userId: user.id,
        expiresAt: expect.any(Date),
      },
    });
    expect(jwtService.signAsync.mock.calls[0][0].jti).toEqual(
      expect.any(String),
    );
    expect(jwtService.signAsync.mock.calls[1][0].jti).toEqual(
      expect.any(String),
    );
    expect(jwtService.signAsync.mock.calls[0][0].jti).not.toBe(
      jwtService.signAsync.mock.calls[1][0].jti,
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: Role.USER,
      },
    });
  });

  it('logs in a user with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123', 10);
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });
    prisma.refreshToken.create.mockResolvedValue({
      id: 'refresh-token-1',
      tokenHash: 'token-hash',
      userId: user.id,
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await service.login({
      email: 'player@example.com',
      password: 'StrongPass123',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'player@example.com' },
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe(user.email);
  });

  it('rejects login with invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123', 10);
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

    await expect(
      service.login({
        email: 'player@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates a valid refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: 'old-refresh-token-id',
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'stored-refresh-token',
      tokenHash: 'stored-token-hash',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      user,
    });
    prisma.refreshToken.update.mockResolvedValue({
      id: 'stored-refresh-token',
      tokenHash: 'stored-token-hash',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
    });
    prisma.refreshToken.create.mockResolvedValue({
      id: 'new-refresh-token',
      tokenHash: 'new-token-hash',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await service.refresh('valid-refresh-token');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'stored-refresh-token' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: expect.any(String),
        userId: user.id,
        expiresAt: expect.any(Date),
      },
    });
    expect(result.refreshToken).toBe('refresh-token');
  });
});
