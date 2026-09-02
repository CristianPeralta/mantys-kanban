/**
 * Test suite: AuthController
 *
 * Unit tests using a mocked AuthService.
 * POST /auth/register is a public (unguarded) route — no overrideGuard needed.
 * No database connection required.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/create-user.dto';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  const originalAllowRegistration = process.env.ALLOW_PUBLIC_REGISTRATION;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Contención post-pentest: register() ahora es 403 salvo que se habilite explícitamente.
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterAll(() => {
    process.env.ALLOW_PUBLIC_REGISTRATION = originalAllowRegistration;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'alice@example.com',
      password: 'secret123',
      name: 'Alice',
    };

    it('should return the result from authService.register (no password in response)', async () => {
      const serviceResult = { id: 'user-1', email: dto.email, name: dto.name, role: 'MEMBER', createdAt: new Date() };
      mockAuthService.register.mockResolvedValue(serviceResult);

      const result = await controller.register(dto);

      expect(result).toEqual(serviceResult);
      expect((result as any).password).toBeUndefined();
    });

    it('should propagate ConflictException when authService.register throws', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(controller.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should forward the dto as-is to authService.register', async () => {
      mockAuthService.register.mockResolvedValue({});

      await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });

    it('should reject with 403 when ALLOW_PUBLIC_REGISTRATION is not "true"', () => {
      process.env.ALLOW_PUBLIC_REGISTRATION = 'false';

      expect(() => controller.register(dto)).toThrow(ForbiddenException);
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });
});
