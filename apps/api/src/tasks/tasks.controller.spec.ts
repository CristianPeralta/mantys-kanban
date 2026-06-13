/**
 * Test suite: TasksController
 *
 * Unit tests for the TasksController class using a mocked TasksService.
 */

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

const mockPrismaService = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TasksController', () => {
  let tasksController: TasksController;
  let tasksService: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    tasksController = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(tasksController).toBeDefined();
  });

  describe('create', () => {
    it('should call create method of TasksService and return the created task', async () => {
      const createTaskDto: CreateTaskDto = { title: 'Sample Task', projectId: 'proj-1' };
      const createdTask = { id: '1', title: 'Sample Task', projectId: 'proj-1' };

      jest.spyOn(tasksService, 'create').mockResolvedValue(createdTask as any);

      const result = await tasksController.create(createTaskDto);

      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
      expect(result).toEqual(createdTask);
    });

    it('should propagate unexpected errors from TasksService', async () => {
      const createTaskDto: CreateTaskDto = { title: 'Sample Task', projectId: 'proj-1' };
      const error = new Error('Unexpected error');
      jest.spyOn(tasksService, 'create').mockRejectedValue(error);

      await expect(tasksController.create(createTaskDto)).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return a task when a valid ID is provided', async () => {
      const taskId = '1';
      const task = { id: taskId, title: 'Task 1', projectId: 'proj-1' };
      jest.spyOn(tasksService, 'findOne').mockResolvedValue(task as any);

      const result = await tasksController.findOne(taskId);

      expect(result).toEqual(task);
      expect(tasksService.findOne).toHaveBeenCalledWith(taskId);
    });

    it('should throw NotFoundException when task is not found', async () => {
      jest.spyOn(tasksService, 'findOne').mockResolvedValue(null);

      await expect(tasksController.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const tasks = [
        { id: '1', title: 'Task 1', projectId: 'proj-1' },
        { id: '2', title: 'Task 2', projectId: 'proj-1' },
      ];
      jest.spyOn(tasksService, 'findAll').mockResolvedValue(tasks as any);

      const result = await tasksController.findAll();

      expect(result).toEqual(tasks);
      expect(tasksService.findAll).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a task and return it', async () => {
      const taskId = '1';
      const deletedTask = { id: taskId, title: 'Sample Task', projectId: 'proj-1' };

      jest.spyOn(tasksService, 'remove').mockResolvedValue(deletedTask as any);

      const result = await tasksController.delete(taskId);

      expect(tasksService.remove).toHaveBeenCalledWith(taskId);
      expect(result).toBe(deletedTask);
    });

    it('should throw NotFoundException when task is not found', async () => {
      jest.spyOn(tasksService, 'remove').mockResolvedValue(null);

      await expect(tasksController.delete('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a task by ID', async () => {
      const taskId = '1';
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = { id: taskId, title: 'Updated Task', projectId: 'proj-1' };

      jest.spyOn(tasksService, 'update').mockResolvedValue(updatedTask as any);

      const result = await tasksController.update(taskId, updateDto);

      expect(tasksService.update).toHaveBeenCalledWith(taskId, updateDto);
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when task is not found', async () => {
      jest.spyOn(tasksService, 'update').mockResolvedValue(null);

      await expect(
        tasksController.update('nonexistent-id', { title: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
