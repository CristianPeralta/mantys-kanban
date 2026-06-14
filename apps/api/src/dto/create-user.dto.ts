import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'Email', example: 'jane@mantys.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password (min 6 characters)', example: 'secret123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Display name', example: 'Jane Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Role', enum: Role, example: Role.MEMBER, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
