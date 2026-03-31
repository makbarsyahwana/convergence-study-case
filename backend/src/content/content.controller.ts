import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published content with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated content list' })
  async findAll(@Query() query: QueryContentDto, @Req() req: any) {
    const hasSubscription = req.user?.hasActiveSubscription || false;
    return this.contentService.findAll(query, hasSubscription);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get content by slug — premium content gated for non-subscribers' })
  @ApiParam({ name: 'slug', description: 'Content slug' })
  @ApiResponse({ status: 200, description: 'Content details' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async findBySlug(@Param('slug') slug: string, @Req() req: any) {
    const hasSubscription = req.user?.hasActiveSubscription || false;

    // Check if slug is a UUID (then treat as ID lookup)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );

    if (isUuid) {
      return this.contentService.findById(slug, hasSubscription);
    }

    return this.contentService.findBySlug(slug, hasSubscription);
  }
}
