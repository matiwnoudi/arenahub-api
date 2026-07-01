import { Rank, Role } from '@prisma/client';

export class PlayerProfileDto {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  level: number;
  xp: number;
  rank: Rank;
  wins: number;
  losses: number;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
