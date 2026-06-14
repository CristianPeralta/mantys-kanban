import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const mockPrisma = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call prisma.task.create with dto', async () => {
      const dto = { title: 'Test', projectId: 'proj-1' };
      const created = { id: '1', ...dto };
      mockPrisma.task.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const tasks = [{ id: '1', title: 'A' }, { id: '2', title: 'B' }];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      const result = await service.findAll();

      expect(mockPrisma.task.findMany).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const task = { id: '1', title: 'A' };
      mockPrisma.task.findUnique.mockResolvedValue(task);

      const result = await service.findOne('1');

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(task);
    });

    it('should return null when not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.findOne('missing');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the task', async () => {
      const updated = { id: '1', title: 'Updated' };
      mockPrisma.task.update.mockResolvedValue(updated);

      const result = await service.update('1', { title: 'Updated' } as any);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'Updated' },
      });
      expect(result).toEqual(updated);
    });

    it('should return null when task not found (P2025)', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrisma.task.update.mockRejectedValue(err);

      const result = await service.update('missing', { title: 'X' } as any);

      expect(result).toBeNull();
    });

    it('should rethrow non-P2025 errors from update', async () => {
      const genericError = new Error('unexpected');
      mockPrisma.task.update.mockRejectedValue(genericError);
      await expect(service.update('id', { title: 'x' } as any)).rejects.toThrow('unexpected');
    });
  });

  describe('remove', () => {
    it('should delete and return the task', async () => {
      const task = { id: '1', title: 'A' };
      mockPrisma.task.delete.mockResolvedValue(task);

      const result = await service.remove('1');

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(task);
    });

    it('should return null when task not found (P2025)', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });
      mockPrisma.task.delete.mockRejectedValue(err);

      const result = await service.remove('missing');

      expect(result).toBeNull();
    });

    it('should rethrow non-P2025 errors from remove', async () => {
      const genericError = new Error('unexpected');
      mockPrisma.task.delete.mockRejectedValue(genericError);
      await expect(service.remove('id')).rejects.toThrow('unexpected');
    });
  });
});
