import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchMode, MatchStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;
  let prisma: {
    match: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    matchParticipant: {
      create: jest.Mock;
    };
  };

  const now = new Date('2026-07-02T00:00:00.000Z');
  const creatorParticipant = {
    id: 'participant-1',
    matchId: 'match-1',
    userId: 'creator-1',
    joinedAt: now,
    user: {
      username: 'Creator',
    },
  };
  const joinedParticipant = {
    id: 'participant-2',
    matchId: 'match-1',
    userId: 'player-2',
    joinedAt: now,
    user: {
      username: 'PlayerTwo',
    },
  };
  const waitingDuel = {
    id: 'match-1',
    mode: MatchMode.DUEL,
    status: MatchStatus.WAITING,
    maxPlayers: 2,
    createdById: 'creator-1',
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
    participants: [creatorParticipant],
  };

  beforeEach(async () => {
    prisma = {
      match: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matchParticipant: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  it('creates a waiting match with the creator as first participant', async () => {
    prisma.match.create.mockResolvedValue(waitingDuel);

    const result = await service.createMatch('creator-1', {
      mode: MatchMode.DUEL,
    });

    expect(prisma.match.create).toHaveBeenCalledWith({
      data: {
        mode: MatchMode.DUEL,
        maxPlayers: 2,
        createdById: 'creator-1',
        participants: {
          create: {
            userId: 'creator-1',
          },
        },
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe(MatchStatus.WAITING);
    expect(result.participants).toHaveLength(1);
  });

  it('joins a waiting match', async () => {
    prisma.match.findUnique
      .mockResolvedValueOnce(waitingDuel)
      .mockResolvedValueOnce({
        ...waitingDuel,
        participants: [creatorParticipant, joinedParticipant],
      });
    prisma.matchParticipant.create.mockResolvedValue({
      id: 'participant-2',
      matchId: 'match-1',
      userId: 'player-2',
      joinedAt: now,
    });

    const result = await service.joinMatch('player-2', 'match-1');

    expect(prisma.matchParticipant.create).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        userId: 'player-2',
      },
    });
    expect(result.participants).toHaveLength(2);
  });

  it('prevents duplicate joins', async () => {
    prisma.match.findUnique.mockResolvedValue(waitingDuel);

    await expect(service.joinMatch('creator-1', 'match-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('prevents joining a full match', async () => {
    prisma.match.findUnique.mockResolvedValue({
      ...waitingDuel,
      participants: [creatorParticipant, joinedParticipant],
    });

    await expect(service.joinMatch('player-3', 'match-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('starts a match when creator has enough players', async () => {
    prisma.match.findUnique.mockResolvedValue({
      ...waitingDuel,
      participants: [creatorParticipant, joinedParticipant],
    });
    prisma.match.update.mockResolvedValue({
      ...waitingDuel,
      status: MatchStatus.IN_PROGRESS,
      startedAt: now,
      participants: [creatorParticipant, joinedParticipant],
    });

    const result = await service.startMatch('creator-1', 'match-1');

    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: {
        status: MatchStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
      },
      include: expect.any(Object),
    });
    expect(result.status).toBe(MatchStatus.IN_PROGRESS);
  });

  it('only allows the creator to start a match', async () => {
    prisma.match.findUnique.mockResolvedValue(waitingDuel);

    await expect(service.startMatch('player-2', 'match-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
