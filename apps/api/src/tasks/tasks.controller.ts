import {
  Controller,
  Get,
  Delete,
  Post,
  Put,
  Body,
  Param,
  ConflictException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { Task } from '../schemas/task.schema';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private taskService: TasksService) {}

  /**
   * Retrieve all tasks
   * @returns {Promise<Task[]>} List of tasks
   */
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of tasks',
    type: Task,
    isArray: true,
  })
  @Get()
  async findAll() {
    return this.taskService.findAll();
  }

  /**
   * Retrieve a single task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Task>} The task object
   * @throws {NotFoundException} If the task does not exist
   */
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({ status: 200, description: 'Returns the task', type: Task })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.taskService.findOne(id);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }

  /**
   * Create a new task
   * @param {CreateTaskDto} body - The task data
   * @returns {Promise<Task>} The created task object
   * @throws {ConflictException} If a task with the same title already exists
   */
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Returns the created task',
    type: Task,
  })
  @ApiResponse({ status: 409, description: 'Task already exists' })
  @Post()
  async create(@Body() body: CreateTaskDto) {
    try {
      return await this.taskService.create(body);
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Task already exists');
      }
      throw error;
    }
  }

  /**
   * Delete a task by ID
   * @param {string} id - Task ID
   * @returns {Promise<Task>} The deleted task object
   * @throws {NotFoundException} If the task does not exist
   */
  @ApiOperation({ summary: 'Delete a task by ID' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    const task = await this.taskService.delete(id);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }

  /**
   * Update a task by ID
   * @param {string} id - Task ID
   * @param {UpdateTaskDto} body - The updated task data
   * @returns {Promise<Task>} The updated task object
   * @throws {NotFoundException} If the task does not exist
   */
  @ApiOperation({ summary: 'Update a task by ID' })
  @ApiResponse({
    status: 200,
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Task does not exist' })
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    const task = await this.taskService.update(id, body);
    if (!task) throw new NotFoundException('Task does not exist');
    return task;
  }
}
