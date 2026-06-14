/**
 * Test suite: ProjectsController — DELETE /projects/:id authorization
 *
 * Tests the role-based access control on the remove() handler.
 * JwtAuthGuard is overridden with a custom guard that injects a mock user
 * so we can test role-level behaviour without running actual JWT validation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const mockProjectsService = {
  remove: jest.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('remove (DELETE :id)', () => {
    it('should throw ForbiddenException when caller role is MEMBER', () => {
      const mockRequest = { user: { id: 'user-2', email: 'member@example.com', role: 'MEMBER' } };

      expect(() => controller.remove('project-1', mockRequest)).toThrow(ForbiddenException);
      expect(() => controller.remove('project-1', mockRequest)).toThrow('Only OWNER can delete a project');
      expect(mockProjectsService.remove).not.toHaveBeenCalled();
    });

    it('should call projectsService.remove and return its value when caller role is OWNER', async () => {
      const mockRequest = { user: { id: 'user-1', email: 'owner@example.com', role: 'OWNER' } };
      mockProjectsService.remove.mockResolvedValue(undefined);

      await controller.remove('project-1', mockRequest);

      expect(mockProjectsService.remove).toHaveBeenCalledTimes(1);
      expect(mockProjectsService.remove).toHaveBeenCalledWith('project-1');
    });
  });
});
