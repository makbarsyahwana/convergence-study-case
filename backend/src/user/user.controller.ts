import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Put('me/preferences')
  @ApiOperation({ summary: 'Update user content preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body()
    body: { topicIds: string[]; emailDigest: boolean; language: string },
  ) {
    return this.userService.updatePreferences(userId, body);
  }
}
