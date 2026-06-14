import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Priority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Set up CI pipeline' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task details', example: 'Configure GitHub Actions', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Priority bucket', enum: Priority, example: Priority.A, required: false })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiProperty({ description: 'Kanban column', enum: TaskStatus, example: TaskStatus.BACKLOG, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ description: 'Deadline (ISO 8601)', example: '2026-07-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ description: 'Assigned user id (cuid)', example: 'clxq...', required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ description: 'Owning project id (cuid)', example: 'clxq...' })
  @IsString()
  projectId: string;
}
