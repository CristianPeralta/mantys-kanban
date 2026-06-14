import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email', example: 'jane@mantys.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'secret123' })
  @IsString()
  @MinLength(6)
  password: string;
}
