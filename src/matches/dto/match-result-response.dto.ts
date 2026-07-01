export class MatchResultResponseDto {
  id: string;
  matchId: string;
  userId: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  score: number;
  isWinner: boolean;
  suspicious: boolean;
  suspiciousReasons: string[];
  submittedAt: Date;
  updatedAt: Date;
}
