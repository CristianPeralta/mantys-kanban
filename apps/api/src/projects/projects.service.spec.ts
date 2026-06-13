/**
 * Test suite: ProjectsService
 *
 * Unit tests using a mocked PrismaService.
 * No database connection required.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const mockPrismaProject = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaService = {
  project: mockPrismaProject,
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project and return it', async () => {
      const dto = { name: 'My Project', description: 'A test project' };
      const created = { id: 'proj-1', name: dto.name, description: dto.description, createdAt: new Date() };
      mockPrismaProject.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaProject.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should create a project without optional description', async () => {
      const dto = { name: 'Minimal Project' };
      const created = { id: 'proj-2', name: dto.name, description: null, createdAt: new Date() };
      mockPrismaProject.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaProject.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const projects = [
        { id: 'proj-1', name: 'Project A', description: null, createdAt: new Date() },
        { id: 'proj-2', name: 'Project B', description: 'Desc', createdAt: new Date() },
      ];
      mockPrismaProject.findMany.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(mockPrismaProject.findMany).toHaveBeenCalled();
      expect(result).toEqual(projects);
    });
  });

  describe('findOne', () => {
    it('should return a project when found', async () => {
      const project = { id: 'proj-1', name: 'Project A', description: null, createdAt: new Date() };
      mockPrismaProject.findUnique.mockResolvedValue(project);

      const result = await service.findOne('proj-1');

      expect(mockPrismaProject.findUnique).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
      expect(result).toEqual(project);
    });

    it('should return null when project is not found', async () => {
      mockPrismaProject.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a project and return it', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { id: 'proj-1', name: 'Updated Name', description: null, createdAt: new Date() };
      mockPrismaProject.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', dto);

      expect(mockPrismaProject.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: dto,
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException on P2025 (project not found)', async () => {
      const dto = { name: 'Ghost' };
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaProject.update.mockRejectedValue(p2025Error);

      await expect(service.update('nonexistent-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent-id', dto)).rejects.toThrow('Project not found');
    });
  });

  describe('remove', () => {
    it('should delete a project and return it', async () => {
      const deleted = { id: 'proj-1', name: 'Project A', description: null, createdAt: new Date() };
      mockPrismaProject.delete.mockResolvedValue(deleted);

      const result = await service.remove('proj-1');

      expect(mockPrismaProject.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
      expect(result).toEqual(deleted);
    });

    it('should throw NotFoundException on P2025 (project not found)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaProject.delete.mockRejectedValue(p2025Error);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-id')).rejects.toThrow('Project not found');
    });
  });
});
