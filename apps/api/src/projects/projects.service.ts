import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  findAll() {
    return this.prisma.project.findMany();
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      return await this.prisma.project.update({ where: { id }, data: dto });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Project not found');
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.project.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Project not found');
      }
      throw e;
    }
  }
}
