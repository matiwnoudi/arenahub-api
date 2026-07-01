import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchMode, MatchStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResponseDto } from './dto/match-response.dto';

const matchInclude = {
  participants: {
    orderBy: { joinedAt: 'asc' },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  },
} satisfies Prisma.MatchInclude;

type MatchWithParticipants = Prisma.MatchGetPayload<{
  include: typeof matchInclude;
}>;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMatch(
    userId: string,
    createMatchDto: CreateMatchDto,
  ): Promise<MatchResponseDto> {
    const match = await this.prisma.match.create({
      data: {
        mode: createMatchDto.mode,
        maxPlayers: this.getMaxPlayers(createMatchDto.mode),
        createdById: userId,
        participants: {
          create: {
            userId,
          },
        },
      },
      include: matchInclude,
    });

    return this.toMatchResponse(match);
  }

  async getMatch(matchId: string): Promise<MatchResponseDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.toMatchResponse(match);
  }

  async joinMatch(userId: string, matchId: string): Promise<MatchResponseDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== MatchStatus.WAITING) {
      throw new BadRequestException('Only waiting matches can be joined');
    }

    if (match.participants.some((participant) => participant.userId === userId)) {
      throw new ConflictException('Player already joined this match');
    }

    if (match.participants.length >= match.maxPlayers) {
      throw new BadRequestException('Match is already full');
    }

    try {
      await this.prisma.matchParticipant.create({
        data: {
          matchId,
          userId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Player already joined this match');
      }

      throw error;
    }

    return this.getMatch(matchId);
  }

  async startMatch(userId: string, matchId: string): Promise<MatchResponseDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.createdById !== userId) {
      throw new ForbiddenException('Only the match creator can start the match');
    }

    if (match.status !== MatchStatus.WAITING) {
      throw new BadRequestException('Only waiting matches can be started');
    }

    if (match.participants.length < this.getMinPlayers(match.mode)) {
      throw new BadRequestException('Not enough players to start this match');
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: matchInclude,
    });

    return this.toMatchResponse(updatedMatch);
  }

  private getMaxPlayers(mode: MatchMode): number {
    const maxPlayersByMode: Record<MatchMode, number> = {
      [MatchMode.DUEL]: 2,
      [MatchMode.TEAM_2V2]: 4,
      [MatchMode.FREE_FOR_ALL]: 8,
    };

    return maxPlayersByMode[mode];
  }

  private getMinPlayers(mode: MatchMode): number {
    const minPlayersByMode: Record<MatchMode, number> = {
      [MatchMode.DUEL]: 2,
      [MatchMode.TEAM_2V2]: 4,
      [MatchMode.FREE_FOR_ALL]: 2,
    };

    return minPlayersByMode[mode];
  }

  private toMatchResponse(match: MatchWithParticipants): MatchResponseDto {
    return {
      id: match.id,
      mode: match.mode,
      status: match.status,
      maxPlayers: match.maxPlayers,
      createdById: match.createdById,
      participants: match.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        username: participant.user.username,
        joinedAt: participant.joinedAt,
      })),
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
