/**
 * Test suite: UsersService
 *
 * Unit tests using a mocked PrismaService.
 * No database connection required.
 * Password field is stripped from all GET responses.
 * create() hashes password with bcrypt before persisting.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const selectedUserFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
};

const mockPrismaUser = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrismaService = {
  user: mockPrismaUser,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should hash the password and pass hashed value to Prisma', async () => {
      const plainPassword = 'secret123';
      const dto = { email: 'user@example.com', password: plainPassword, name: 'Alice' };
      const created = { id: 'user-1', email: dto.email, name: dto.name, role: 'MEMBER', createdAt: new Date() };
      mockPrismaUser.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(mockPrismaUser.create).toHaveBeenCalledTimes(1);
      const callArg = mockPrismaUser.create.mock.calls[0][0];

      // The data passed to Prisma must NOT be the raw DTO (password must be hashed)
      expect(callArg.data.password).not.toBe(plainPassword);
      expect(callArg.data.email).toBe(dto.email);
      expect(callArg.select).toEqual(selectedUserFields);

      // The captured hashed password must be verifiable with bcrypt
      expect(bcrypt.compareSync(plainPassword, callArg.data.password)).toBe(true);

      expect(result).toEqual(created);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw ConflictException on P2002 (duplicate email)', async () => {
      const dto = { email: 'dup@example.com', password: 'secret123', name: 'Bob' };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      mockPrismaUser.create.mockRejectedValue(p2002Error);

      await expect(service.create(dto as any)).rejects.toThrow(ConflictException);
      await expect(service.create(dto as any)).rejects.toThrow('Email already exists');
    });

    it('should re-throw non-P2002 errors on create', async () => {
      const dto = { email: 'user@example.com', password: 'secret123', name: 'Alice' };
      const genericError = new Error('Database connection failed');
      mockPrismaUser.create.mockRejectedValue(genericError);

      await expect(service.create(dto as any)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findAll', () => {
    it('should return all users without password', async () => {
      const users = [
        { id: 'user-1', email: 'a@example.com', name: 'Alice', role: 'MEMBER', createdAt: new Date() },
        { id: 'user-2', email: 'b@example.com', name: 'Bob', role: 'ADMIN', createdAt: new Date() },
      ];
      mockPrismaUser.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        select: selectedUserFields,
      });
      expect(result).toEqual(users);
      result.forEach((u) => expect((u as any).password).toBeUndefined());
    });
  });

  describe('findOne', () => {
    it('should return a user without password when found', async () => {
      const user = { id: 'user-1', email: 'a@example.com', name: 'Alice', role: 'MEMBER', createdAt: new Date() };
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.findOne('user-1');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: selectedUserFields,
      });
      expect(result).toEqual(user);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('should update a user and return without password', async () => {
      const dto = { name: 'Alice Updated' };
      const updated = { id: 'user-1', email: 'a@example.com', name: 'Alice Updated', role: 'MEMBER', createdAt: new Date() };
      mockPrismaUser.update.mockResolvedValue(updated);

      const result = await service.update('user-1', dto as any);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: dto,
        select: selectedUserFields,
      });
      expect(result).toEqual(updated);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException on P2025 (user not found)', async () => {
      const dto = { name: 'Ghost' };
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaUser.update.mockRejectedValue(p2025Error);

      await expect(service.update('nonexistent-id', dto as any)).rejects.toThrow(NotFoundException);
      await expect(service.update('nonexistent-id', dto as any)).rejects.toThrow('User not found');
    });

    it('should re-throw non-P2025 errors on update', async () => {
      const dto = { name: 'Alice' };
      const genericError = new Error('Database connection failed');
      mockPrismaUser.update.mockRejectedValue(genericError);

      await expect(service.update('user-1', dto as any)).rejects.toThrow('Database connection failed');
    });
  });

  describe('remove', () => {
    it('should delete a user and return without password', async () => {
      const deleted = { id: 'user-1', email: 'a@example.com', name: 'Alice', role: 'MEMBER', createdAt: new Date() };
      mockPrismaUser.delete.mockResolvedValue(deleted);

      const result = await service.remove('user-1');

      expect(mockPrismaUser.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: selectedUserFields,
      });
      expect(result).toEqual(deleted);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException on P2025 (user not found)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      mockPrismaUser.delete.mockRejectedValue(p2025Error);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should re-throw non-P2025 errors on remove', async () => {
      const genericError = new Error('Database connection failed');
      mockPrismaUser.delete.mockRejectedValue(genericError);

      await expect(service.remove('user-1')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByEmail', () => {
    it('should call prisma.user.findUnique with the given email and return the user including password', async () => {
      const userWithPassword = {
        id: 'user-1',
        email: 'a@example.com',
        name: 'Alice',
        role: 'MEMBER',
        createdAt: new Date(),
        password: '$2b$10$hashedpassword',
      };
      mockPrismaUser.findUnique.mockResolvedValue(userWithPassword);

      const result = await service.findByEmail('a@example.com');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@example.com' },
      });
      expect(result).toEqual(userWithPassword);
      expect((result as any).password).toBeDefined();
    });

    it('should return null when no user is found for the given email', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });
  });
});
