import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Slug utilities
  // ---------------------------------------------------------------------------

  /**
   * Converts a project name to a URL-safe slug:
   * - NFKD normalize to strip accents
   * - lowercase + trim
   * - replace runs of non-alphanumeric chars with a hyphen
   * - strip leading/trailing hyphens
   * - fall back to 'project' when the result is empty
   */
  private slugify(name: string): string {
    return (
      name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') // strip combining diacritics
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // non-alnum runs → hyphen
        .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
      || 'project'
    );
  }

  /**
   * Returns a unique slug derived from `name`.
   * Queries existing slugs with the same base and picks the next free suffix.
   * On rename, pass `excludeId` to ignore the current project's own slug.
   */
  async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = this.slugify(name);

    const existing = await this.prisma.project.findMany({
      where: {
        slug: { startsWith: base },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { slug: true },
    });

    const slugSet = new Set(existing.map((p) => p.slug));

    if (!slugSet.has(base)) {
      return base;
    }

    const suffix = this.computeNextSuffix(base, slugSet);
    return `${base}-${suffix}`;
  }

  /**
   * Finds the highest numeric suffix among slugs matching `base` or `base-N`,
   * then returns max + 1 (minimum 2, so the first duplicate becomes `base-2`).
   */
  private computeNextSuffix(base: string, slugSet: Set<string>): number {
    const pattern = new RegExp(`^${base}-(\\d+)$`);
    let max = 1;

    for (const slug of slugSet) {
      const match = pattern.exec(slug);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    }

    return max + 1;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(dto: CreateProjectDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    return this.prisma.project.create({ data: { ...dto, slug } });
  }

  findAll() {
    return this.prisma.project.findMany();
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      const data: typeof dto & { slug?: string } = { ...dto };

      if (dto.name !== undefined) {
        data.slug = await this.generateUniqueSlug(dto.name, id);
      }

      return await this.prisma.project.update({ where: { id }, data });
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
