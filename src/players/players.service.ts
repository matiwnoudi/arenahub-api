import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PlayerProfileDto } from './dto/player-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const playerProfileSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  level: true,
  xp: true,
  rank: true,
  wins: true,
  losses: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<PlayerProfileDto> {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: playerProfileSelect,
    });

    if (!profile) {
      throw new NotFoundException('Player profile not found');
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<PlayerProfileDto> {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: updateProfileDto.email?.trim().toLowerCase(),
          username: updateProfileDto.username?.trim(),
          avatar: updateProfileDto.avatar?.trim(),
        },
        select: playerProfileSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email or username is already in use');
      }

      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException('Player profile not found');
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }
}
