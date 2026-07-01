import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SubmitMatchResultDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  kills: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  deaths: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  assists: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200000)
  damage: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500000)
  score: number;

  @IsOptional()
  @IsBoolean()
  isWinner?: boolean;
}
