/**
 * Test suite: TasksService
 *
 * Unit tests using a mocked PrismaService.
 * No database connection required.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const mockPrismaTask = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaService = {
  task: mockPrismaTask,
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call prisma.task.create with the provided dto', async () => {
      const dto = { title: 'Test Task', projectId: 'proj-1' };
      const expected = { id: 'task-1', ...dto };
      mockPrismaTask.create.mockResolvedValue(expected);

      const result = await service.create(dto as any);

      expect(mockPrismaTask.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return all tasks from prisma.task.findMany', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', projectId: 'proj-1' },
        { id: 'task-2', title: 'Task 2', projectId: 'proj-1' },
      ];
      mockPrismaTask.findMany.mockResolvedValue(tasks);

      const result = await service.findAll();

      expect(mockPrismaTask.findMany).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should call prisma.task.findUnique with the given id', async () => {
      const task = { id: 'task-1', title: 'Task 1', projectId: 'proj-1' };
      mockPrismaTask.findUnique.mockResolvedValue(task);

      const result = await service.findOne('task-1');

      expect(mockPrismaTask.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
      expect(result).toEqual(task);
    });

    it('should return null when task is not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should call prisma.task.update and return the updated task', async () => {
      const dto = { title: 'Updated Task' };
      const updated = { id: 'task-1', title: 'Updated Task', projectId: 'proj-1' };
      mockPrismaTask.update.mockResolvedValue(updated);

      const result = await service.update('task-1', dto as any);

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: dto,
      });
      expect(result).toEqual(updated);
    });

    it('should return null when task is not found (P2025)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaTask.update.mockRejectedValue(p2025Error);

      const result = await service.update('nonexistent-id', { title: 'x' } as any);

      expect(result).toBeNull();
    });

    it('should re-throw non-P2025 errors', async () => {
      const genericError = new Error('Database connection failed');
      mockPrismaTask.update.mockRejectedValue(genericError);

      await expect(service.update('task-1', { title: 'x' } as any)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('remove', () => {
    it('should call prisma.task.delete and return the deleted task', async () => {
      const deleted = { id: 'task-1', title: 'Task 1', projectId: 'proj-1' };
      mockPrismaTask.delete.mockResolvedValue(deleted);

      const result = await service.remove('task-1');

      expect(mockPrismaTask.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
      expect(result).toEqual(deleted);
    });

    it('should return null when task is not found (P2025)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaTask.delete.mockRejectedValue(p2025Error);

      const result = await service.remove('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should re-throw non-P2025 errors', async () => {
      const genericError = new Error('Database connection failed');
      mockPrismaTask.delete.mockRejectedValue(genericError);

      await expect(service.remove('task-1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
