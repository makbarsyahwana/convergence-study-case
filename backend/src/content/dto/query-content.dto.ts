import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryContentDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['ARTICLE', 'VIDEO'] })
  @IsOptional()
  @IsEnum(['ARTICLE', 'VIDEO'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagSlug?: string;
}
