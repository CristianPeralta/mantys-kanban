import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiResponse({ status: 200, description: 'Returns accessToken and user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns the JWT user payload' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    return req.user;
  }
}
