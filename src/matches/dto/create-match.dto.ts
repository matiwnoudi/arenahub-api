import { MatchMode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateMatchDto {
  @IsEnum(MatchMode)
  mode: MatchMode;
}
