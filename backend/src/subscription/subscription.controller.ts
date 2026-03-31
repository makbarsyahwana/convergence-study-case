import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionService } from './subscription.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Subscription')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Active subscription details' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getMySubscription(userId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 201, description: 'Subscription upgraded' })
  async upgrade(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: 'MONTHLY' | 'YEARLY' },
  ) {
    return this.subscriptionService.upgradePlan(userId, body.plan);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }
}
