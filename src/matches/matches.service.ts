import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchMode, MatchResult, MatchStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResultResponseDto } from './dto/match-result-response.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { SubmitMatchResultDto } from './dto/submit-match-result.dto';

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

const matchResultsInclude = {
  participants: true,
  results: true,
} satisfies Prisma.MatchInclude;

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

  async submitResult(
    userId: string,
    matchId: string,
    submitMatchResultDto: SubmitMatchResultDto,
  ): Promise<MatchResultResponseDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchResultsInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Results can only be submitted for in-progress matches',
      );
    }

    const participant = match.participants.find(
      (matchParticipant) => matchParticipant.userId === userId,
    );

    if (!participant) {
      throw new ForbiddenException('Only match participants can submit results');
    }

    const suspiciousReasons =
      this.getSuspiciousReasons(submitMatchResultDto);
    const result = await this.prisma.matchResult.upsert({
      where: { participantId: participant.id },
      create: {
        matchId,
        participantId: participant.id,
        userId,
        kills: submitMatchResultDto.kills,
        deaths: submitMatchResultDto.deaths,
        assists: submitMatchResultDto.assists,
        damage: submitMatchResultDto.damage,
        score: submitMatchResultDto.score,
        isWinner: submitMatchResultDto.isWinner ?? false,
        suspicious: suspiciousReasons.length > 0,
        suspiciousReasons,
      },
      update: {
        kills: submitMatchResultDto.kills,
        deaths: submitMatchResultDto.deaths,
        assists: submitMatchResultDto.assists,
        damage: submitMatchResultDto.damage,
        score: submitMatchResultDto.score,
        isWinner: submitMatchResultDto.isWinner ?? false,
        suspicious: suspiciousReasons.length > 0,
        suspiciousReasons,
      },
    });

    return this.toMatchResultResponse(result);
  }

  async finishMatch(userId: string, matchId: string): Promise<MatchResponseDto> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchResultsInclude,
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.createdById !== userId) {
      throw new ForbiddenException('Only the match creator can finish the match');
    }

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress matches can be finished',
      );
    }

    const submittedUserIds = new Set(
      match.results.map((result) => result.userId),
    );
    const missingResult = match.participants.some(
      (participant) => !submittedUserIds.has(participant.userId),
    );

    if (missingResult) {
      throw new BadRequestException(
        'All participants must submit results before finishing',
      );
    }

    if (!match.results.some((result) => result.isWinner)) {
      throw new BadRequestException(
        'At least one submitted result must mark a winner',
      );
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.FINISHED,
        finishedAt: new Date(),
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

  private toMatchResultResponse(result: MatchResult): MatchResultResponseDto {
    return {
      id: result.id,
      matchId: result.matchId,
      userId: result.userId,
      kills: result.kills,
      deaths: result.deaths,
      assists: result.assists,
      damage: result.damage,
      score: result.score,
      isWinner: result.isWinner,
      suspicious: result.suspicious,
      suspiciousReasons: result.suspiciousReasons,
      submittedAt: result.submittedAt,
      updatedAt: result.updatedAt,
    };
  }

  private getSuspiciousReasons(
    submitMatchResultDto: SubmitMatchResultDto,
  ): string[] {
    const reasons: string[] = [];

    if (submitMatchResultDto.kills > 60) {
      reasons.push('Kills are unusually high');
    }

    if (submitMatchResultDto.deaths > 80) {
      reasons.push('Deaths are unusually high');
    }

    if (submitMatchResultDto.damage > 100000) {
      reasons.push('Damage is unusually high');
    }

    if (submitMatchResultDto.score > 250000) {
      reasons.push('Score is unusually high');
    }

    if (submitMatchResultDto.kills > 0 && submitMatchResultDto.damage === 0) {
      reasons.push('Kills with zero damage is suspicious');
    }

    if (submitMatchResultDto.kills >= 40 && submitMatchResultDto.deaths === 0) {
      reasons.push('High kills with zero deaths is suspicious');
    }

    return reasons;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
