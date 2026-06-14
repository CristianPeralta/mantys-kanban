import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieve all users
   */
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns an array of users' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Retrieve a single user by ID
   */
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Returns the user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Create a new user
   */
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'Returns the created user' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  /**
   * Update a user by ID
   */
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'Returns the updated user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  /**
   * Delete a user by ID
   */
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
