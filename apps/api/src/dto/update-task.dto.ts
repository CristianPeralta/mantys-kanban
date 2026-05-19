import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiProperty({
    example: 'Updated Task Title',
    description: 'The updated title of the task',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title: string;

  @ApiProperty({
    example: 'Updated Task Description',
    description: 'The updated description of the task',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the task is done',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
