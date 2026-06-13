import {
  Controller,
  Get,
  Delete,
  Post,
  Put,
  Body,
  Param,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  /**
   * Retrieve all tasks
   */
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of tasks',
  })
  @Get()
  async findAll() {
    return this.taskService.findAll();
  }

  /**
   * Retrieve a single task by ID
   */
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({ status: 200, description: 'Returns the task' })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.taskService.findOne(id);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }

  /**
   * Create a new task
   */
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Returns the created task',
  })
  @Post()
  async create(@Body() body: CreateTaskDto) {
    return this.taskService.create(body);
  }

  /**
   * Delete a task by ID
   */
  @ApiOperation({ summary: 'Delete a task by ID' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    const task = await this.taskService.remove(id);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }

  /**
   * Update a task by ID
   */
  @ApiOperation({ summary: 'Update a task by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    const task = await this.taskService.update(id, body);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }
}
