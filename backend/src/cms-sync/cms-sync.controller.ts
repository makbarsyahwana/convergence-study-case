import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { CmsSyncService } from './cms-sync.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('CMS Sync')
@Controller('cms-sync')
export class CmsSyncController {
  constructor(
    private readonly cmsSyncService: CmsSyncService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Strapi CMS webhook endpoint for content sync' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-strapi-event') event: string,
    @Headers('x-strapi-signature') signature: string,
  ) {
    this.verifyWebhookSignature(payload, signature);

    return this.cmsSyncService.handleWebhook({
      event: event || payload.event,
      model: payload.model,
      entry: payload.entry,
    });
  }

  @Post('full-sync')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger full content sync from Strapi (admin only)' })
  async triggerFullSync() {
    return this.cmsSyncService.fullSync();
  }

  private verifyWebhookSignature(payload: any, signature: string): void {
    const secret = this.config.get<string>('STRAPI_WEBHOOK_SECRET', '');

    // Skip verification if no secret configured (local dev)
    if (!secret) return;

    if (!signature) {
      throw new ForbiddenException('Missing webhook signature');
    }

    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const sigBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        throw new ForbiddenException('Invalid webhook signature');
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Invalid webhook signature');
    }
  }
}
