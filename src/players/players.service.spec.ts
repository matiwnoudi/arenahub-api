import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Rank, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from './players.service';

describe('PlayersService', () => {
  let service: PlayersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const profile = {
    id: 'user-1',
    email: 'player@example.com',
    username: 'ArenaPlayer',
    avatar: null,
    level: 1,
    xp: 0,
    rank: Rank.BRONZE,
    wins: 0,
    losses: 0,
    role: Role.USER,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    updatedAt: new Date('2026-06-13T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it('returns the current player profile', async () => {
    prisma.user.findUnique.mockResolvedValue(profile);

    await expect(service.getProfile('user-1')).resolves.toEqual(profile);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.objectContaining({
        email: true,
        username: true,
        level: true,
        rank: true,
        wins: true,
        losses: true,
      }),
    });
  });

  it('throws when the player profile does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfile('missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates editable profile fields and normalizes email', async () => {
    prisma.user.update.mockResolvedValue({
      ...profile,
      email: 'new@example.com',
      username: 'NewPlayer',
      avatar: 'https://example.com/avatar.png',
    });

    const result = await service.updateProfile('user-1', {
      email: 'NEW@EXAMPLE.COM',
      username: ' NewPlayer ',
      avatar: ' https://example.com/avatar.png ',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        email: 'new@example.com',
        username: 'NewPlayer',
        avatar: 'https://example.com/avatar.png',
      },
      select: expect.any(Object),
    });
    expect(result.email).toBe('new@example.com');
    expect(result.username).toBe('NewPlayer');
  });

  it('maps unique profile conflicts to a conflict exception', async () => {
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.updateProfile('user-1', { username: 'TakenName' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
