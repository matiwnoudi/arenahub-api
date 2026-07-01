import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PlayerProfileDto } from './dto/player-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload): Promise<PlayerProfileDto> {
    return this.playersService.getProfile(user.sub);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<PlayerProfileDto> {
    return this.playersService.updateProfile(user.sub, updateProfileDto);
  }
}
