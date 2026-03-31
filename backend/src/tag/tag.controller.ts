import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all top-level tags/topics' })
  @ApiResponse({ status: 200, description: 'List of tags with content counts' })
  async findAll() {
    return this.tagService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get tag by slug with associated content' })
  @ApiResponse({ status: 200, description: 'Tag details with content' })
  async findBySlug(@Param('slug') slug: string) {
    return this.tagService.findBySlug(slug);
  }
}
