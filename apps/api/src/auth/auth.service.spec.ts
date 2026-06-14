/**
 * Test suite: AuthService
 *
 * Unit tests using mocked UsersService and JwtService.
 * bcrypt is mocked for deterministic comparison behavior.
 * No database connection required.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should call usersService.create and return user without password', async () => {
      const dto: CreateUserDto = {
        email: 'alice@example.com',
        password: 'secret123',
        name: 'Alice',
      };
      const createdUser = {
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        role: 'MEMBER',
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith({ ...dto, role: Role.MEMBER });
      expect(result).toEqual(createdUser);
      expect((result as any).password).toBeUndefined();
    });

    it('should override role to MEMBER even when caller supplies role OWNER', async () => {
      const dtoWithOwner: CreateUserDto = {
        email: 'bob@example.com',
        password: 'secret123',
        name: 'Bob',
        role: Role.OWNER,
      };
      const createdUser = {
        id: 'user-2',
        email: dtoWithOwner.email,
        name: dtoWithOwner.name,
        role: 'MEMBER',
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(createdUser);

      await service.register(dtoWithOwner);

      expect(mockUsersService.create).toHaveBeenCalledWith({ ...dtoWithOwner, role: Role.MEMBER });
    });

    it('should propagate errors from usersService.create', async () => {
      mockUsersService.create.mockRejectedValue(new Error('db error'));
      await expect(
        service.register({ email: 'x@x.com', password: 'p', name: 'X' }),
      ).rejects.toThrow('db error');
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const userWithPassword = {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'MEMBER',
        createdAt: new Date(),
        password: '$2b$10$hashedpassword',
      };
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('alice@example.com', 'secret123');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('secret123', userWithPassword.password);
      expect((result as any).password).toBeUndefined();
      expect(result).toMatchObject({ id: 'user-1', email: 'alice@example.com' });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('unknown@example.com', 'secret123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const userWithPassword = {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'MEMBER',
        createdAt: new Date(),
        password: '$2b$10$hashedpassword',
      };
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('alice@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should call usersService.findByEmail, compare password, sign JWT and return accessToken with user', async () => {
      const dto: LoginDto = {
        email: 'alice@example.com',
        password: 'secret123',
      };
      const userWithPassword = {
        id: 'user-1',
        email: dto.email,
        name: 'Alice',
        role: 'MEMBER',
        createdAt: new Date(),
        password: '$2b$10$hashedpassword',
      };
      mockUsersService.findByEmail.mockResolvedValue(userWithPassword);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('signed-token');

      const result = await service.login(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: userWithPassword.id,
        email: userWithPassword.email,
        role: userWithPassword.role,
      });
      expect(result).toHaveProperty('accessToken', 'signed-token');
      expect(result).toHaveProperty('user');
      expect((result as any).user.password).toBeUndefined();
    });

    it('should throw UnauthorizedException when login credentials are wrong', async () => {
      const dto: LoginDto = { email: 'alice@example.com', password: 'wrong' };
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
