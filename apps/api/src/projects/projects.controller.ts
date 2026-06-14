import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Retrieve all projects
   */
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Returns an array of projects' })
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  /**
   * Retrieve a single project by ID
   */
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, description: 'Returns the project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  /**
   * Create a new project
   */
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Returns the created project' })
  @Post()
  create(@Body() body: CreateProjectDto) {
    return this.projectsService.create(body);
  }

  /**
   * Update a project by ID
   */
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiResponse({ status: 200, description: 'Returns the updated project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateProjectDto) {
    return this.projectsService.update(id, body);
  }

  /**
   * Delete a project by ID — OWNER only
   */
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an OWNER' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can delete a project');
    }
    return this.projectsService.remove(id);
  }
}
