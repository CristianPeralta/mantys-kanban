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
      const created = { id: 'proj-1', name: dto.name, slug: 'my-project', description: dto.description, createdAt: new Date() };
      mockPrismaProject.findMany.mockResolvedValue([]);
      mockPrismaProject.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaProject.create).toHaveBeenCalledWith({
        data: { ...dto, slug: 'my-project' },
      });
      expect(result).toEqual(created);
    });

    it('should create a project without optional description', async () => {
      const dto = { name: 'Minimal Project' };
      const created = { id: 'proj-2', name: dto.name, slug: 'minimal-project', description: null, createdAt: new Date() };
      mockPrismaProject.findMany.mockResolvedValue([]);
      mockPrismaProject.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaProject.create).toHaveBeenCalledWith({
        data: { ...dto, slug: 'minimal-project' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const projects = [
        { id: 'proj-1', name: 'Project A', slug: 'project-a', description: null, createdAt: new Date() },
        { id: 'proj-2', name: 'Project B', slug: 'project-b', description: 'Desc', createdAt: new Date() },
      ];
      mockPrismaProject.findMany.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(mockPrismaProject.findMany).toHaveBeenCalled();
      expect(result).toEqual(projects);
    });
  });

  describe('findOne', () => {
    it('should return a project when found', async () => {
      const project = { id: 'proj-1', name: 'Project A', slug: 'project-a', description: null, createdAt: new Date() };
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
    it('should update a project and return it with a new slug', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { id: 'proj-1', name: 'Updated Name', slug: 'updated-name', description: null, createdAt: new Date() };
      mockPrismaProject.findMany.mockResolvedValue([]);
      mockPrismaProject.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', dto);

      expect(mockPrismaProject.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { ...dto, slug: 'updated-name' },
      });
      expect(result).toEqual(updated);
    });

    it('should update a project without name change (no slug regen needed)', async () => {
      const dto = { description: 'New description' };
      const updated = { id: 'proj-1', name: 'Alpha', slug: 'alpha', description: 'New description', createdAt: new Date() };
      mockPrismaProject.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', dto);

      expect(mockPrismaProject.findMany).not.toHaveBeenCalled();
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
      mockPrismaProject.findMany.mockResolvedValue([]);
      mockPrismaProject.update.mockRejectedValue(p2025Error);

      await expect(service.update('nonexistent-id', dto)).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent-id', dto)).rejects.toThrow('Project not found');
    });
  });

  describe('remove', () => {
    it('should delete a project and return it', async () => {
      const deleted = { id: 'proj-1', name: 'Project A', slug: 'project-a', description: null, createdAt: new Date() };
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

  // -----------------------------------------------------------------------
  // slugify (private — tested indirectly via generateUniqueSlug)
  // -----------------------------------------------------------------------

  describe('slugify (via generateUniqueSlug)', () => {
    beforeEach(() => {
      mockPrismaProject.findMany.mockResolvedValue([]);
    });

    it('converts spaces and uppercase to lowercase-hyphenated', async () => {
      const slug = await service.generateUniqueSlug('My Project');
      expect(slug).toBe('my-project');
    });

    it('strips accents (NFKD normalize)', async () => {
      const slug = await service.generateUniqueSlug('Café Açaí');
      expect(slug).toBe('cafe-acai');
    });

    it('normalizes special characters: "Hello, World! (2024)" → "hello-world-2024"', async () => {
      const slug = await service.generateUniqueSlug('Hello, World! (2024)');
      expect(slug).toBe('hello-world-2024');
    });

    it('trims leading and trailing hyphens', async () => {
      const slug = await service.generateUniqueSlug('  --test--  ');
      expect(slug).toBe('test');
    });

    it('falls back to "project" for empty/no-alnum input', async () => {
      const slug = await service.generateUniqueSlug('!!!');
      expect(slug).toBe('project');
    });
  });

  // -----------------------------------------------------------------------
  // generateUniqueSlug — collision resolution
  // -----------------------------------------------------------------------

  describe('generateUniqueSlug', () => {
    it('returns base slug when no collision', async () => {
      mockPrismaProject.findMany.mockResolvedValue([]);
      const slug = await service.generateUniqueSlug('My Project');
      expect(slug).toBe('my-project');
    });

    it('appends -2 when base slug already exists', async () => {
      mockPrismaProject.findMany.mockResolvedValue([{ slug: 'my-project' }]);
      const slug = await service.generateUniqueSlug('My Project');
      expect(slug).toBe('my-project-2');
    });

    it('appends -3 when base and -2 already exist (third collision)', async () => {
      mockPrismaProject.findMany.mockResolvedValue([
        { slug: 'my-project' },
        { slug: 'my-project-2' },
      ]);
      const slug = await service.generateUniqueSlug('My Project');
      expect(slug).toBe('my-project-3');
    });

    it('excludes current project id on rename so slug is preserved when name unchanged', async () => {
      // Only one project with slug 'alpha' (the one being renamed), so no collision
      mockPrismaProject.findMany.mockResolvedValue([]);
      const slug = await service.generateUniqueSlug('Alpha', 'proj-1');
      expect(slug).toBe('alpha');
    });

    it('rename with collision gets -2', async () => {
      // Another project already owns 'beta'
      mockPrismaProject.findMany.mockResolvedValue([{ slug: 'beta' }]);
      const slug = await service.generateUniqueSlug('Beta', 'proj-2');
      expect(slug).toBe('beta-2');
    });
  });

  // -----------------------------------------------------------------------
  // findBySlug
  // -----------------------------------------------------------------------

  describe('findBySlug', () => {
    it('returns the project when slug matches', async () => {
      const project = { id: 'proj-1', name: 'My Project', slug: 'my-project', description: null, createdAt: new Date() };
      mockPrismaProject.findUnique.mockResolvedValue(project);

      const result = await service.findBySlug('my-project');

      expect(mockPrismaProject.findUnique).toHaveBeenCalledWith({ where: { slug: 'my-project' } });
      expect(result).toEqual(project);
    });

    it('throws NotFoundException when slug does not exist', async () => {
      mockPrismaProject.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('unknown')).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug('unknown')).rejects.toThrow('Project not found');
    });
  });
});
