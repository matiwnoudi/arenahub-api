import { MatchMode, MatchStatus } from '@prisma/client';

export class MatchParticipantDto {
  id: string;
  userId: string;
  username: string;
  joinedAt: Date;
}

export class MatchResponseDto {
  id: string;
  mode: MatchMode;
  status: MatchStatus;
  maxPlayers: number;
  createdById: string;
  participants: MatchParticipantDto[];
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
