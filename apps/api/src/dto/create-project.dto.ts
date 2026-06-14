import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'Q3 Launch' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project description', example: 'Roadmap items for Q3', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
