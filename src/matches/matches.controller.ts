import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResultResponseDto } from './dto/match-result-response.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { SubmitMatchResultDto } from './dto/submit-match-result.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createMatchDto: CreateMatchDto,
  ): Promise<MatchResponseDto> {
    return this.matchesService.createMatch(user.sub, createMatchDto);
  }

  @Get(':matchId')
  findOne(@Param('matchId') matchId: string): Promise<MatchResponseDto> {
    return this.matchesService.getMatch(matchId);
  }

  @Post(':matchId/join')
  join(
    @CurrentUser() user: JwtPayload,
    @Param('matchId') matchId: string,
  ): Promise<MatchResponseDto> {
    return this.matchesService.joinMatch(user.sub, matchId);
  }

  @Post(':matchId/start')
  start(
    @CurrentUser() user: JwtPayload,
    @Param('matchId') matchId: string,
  ): Promise<MatchResponseDto> {
    return this.matchesService.startMatch(user.sub, matchId);
  }

  @Post(':matchId/results')
  submitResult(
    @CurrentUser() user: JwtPayload,
    @Param('matchId') matchId: string,
    @Body() submitMatchResultDto: SubmitMatchResultDto,
  ): Promise<MatchResultResponseDto> {
    return this.matchesService.submitResult(
      user.sub,
      matchId,
      submitMatchResultDto,
    );
  }

  @Post(':matchId/finish')
  finish(
    @CurrentUser() user: JwtPayload,
    @Param('matchId') matchId: string,
  ): Promise<MatchResponseDto> {
    return this.matchesService.finishMatch(user.sub, matchId);
  }
}
