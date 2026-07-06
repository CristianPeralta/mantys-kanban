#!/usr/bin/env node
// One-shot migration: Notion "324b369f" database -> MANTYS kanban.
// Run with: node dist/migrate-notion.js [--dry-run] [--limit=N]
import { Client } from '@notionhq/client';
import { Priority, TaskStatus } from '@mantys/types';
import { login, getProjectBySlug, createTask, type CreateTaskInput } from './api';

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID ?? '324b369f';
const PROJECT_SLUG = 'operaciones';

export const ASSIGNEE_MAP: Record<string, string | undefined> = {
  Cristian: 'cmqehbgv90001162gk6xcuo2l',
  Socia: 'cmqehbh6v0002162gsidrfr95',
};

export const STATUS_MAP: Record<string, TaskStatus | 'SKIP'> = {
  Backlog: TaskStatus.BACKLOG,
  'Por hacer': TaskStatus.TODO,
  'En progreso': TaskStatus.IN_PROGRESS,
  'En Revision': TaskStatus.REVIEW,
  Hecho: TaskStatus.DONE,
  Bloqueado: TaskStatus.IN_PROGRESS,
  Cancelada: 'SKIP',
};

export const PRIORITY_MAP: Record<string, Priority> = {
  Alta: Priority.A,
  P1: Priority.A,
  Media: Priority.B,
  P2: Priority.B,
  Baja: Priority.C,
};

// Minimal shape of the Notion properties we read — avoids depending on the
// full @notionhq/client response types just to keep this testable.
export interface NotionPage {
  properties: Record<string, any>;
}

function titleText(prop: any): string {
  return (prop?.title ?? []).map((t: any) => t.plain_text).join('');
}

function richText(prop: any): string {
  return (prop?.rich_text ?? []).map((t: any) => t.plain_text).join('');
}

/**
 * Maps a raw Notion page to a kanban CreateTaskInput.
 * Returns null when the task should be skipped (status Cancelada).
 */
export function mapNotionTaskToCreateDto(page: NotionPage): CreateTaskInput | null {
  const props = page.properties;
  const title = titleText(props.Tarea);

  const estado: string | undefined = props.Estado?.select?.name;
  const status = estado ? STATUS_MAP[estado] : TaskStatus.BACKLOG;
  if (status === 'SKIP') return null;
  if (status === undefined) {
    console.warn(`[migrate-notion] skipping "${title}": unrecognized Estado value "${estado}"`);
    return null;
  }

  const prioridad: string | undefined = props.Prioridad?.select?.name;
  let priority: Priority;
  if (!prioridad) {
    priority = Priority.A;
  } else if (PRIORITY_MAP[prioridad] !== undefined) {
    priority = PRIORITY_MAP[prioridad];
  } else {
    console.warn(
      `[migrate-notion] "${title}": unrecognized Prioridad value "${prioridad}", defaulting to Priority.A`,
    );
    priority = Priority.A;
  }

  const fechaLimite: string | undefined = props['Fecha limite']?.date?.start;
  // Notion gives date-only strings ("2026-06-03"); Prisma's DateTime requires full ISO-8601.
  const deadline = fechaLimite ? new Date(fechaLimite).toISOString() : undefined;

  const notas = richText(props.Notas);
  const paraQue = richText(props['Para qué']);
  const description = [notas, paraQue].filter((s) => s.trim().length > 0).join('\n\n') || undefined;

  const responsable: string | undefined = props.Responsable?.select?.name;
  const assigneeId =
    responsable && responsable !== 'Ambos' ? ASSIGNEE_MAP[responsable] : undefined;

  return {
    title,
    projectId: '', // filled in by the caller once the project id is resolved
    status,
    priority,
    deadline,
    description,
    assigneeId,
  };
}

export async function fetchAllPages(notion: Client, dataSourceId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });
    pages.push(...(res.results as unknown as NotionPage[]));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

export async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const database = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
  const dataSourceId = (database as any).data_sources[0].id;

  const pages = await fetchAllPages(notion, dataSourceId);

  let skippedCancelada = 0;
  let skippedUnrecognized = 0;
  let mapped: CreateTaskInput[] = [];
  for (const page of pages) {
    const dto = mapNotionTaskToCreateDto(page);
    if (!dto) {
      if (page.properties.Estado?.select?.name === 'Cancelada') skippedCancelada++;
      else skippedUnrecognized++;
      continue;
    }
    mapped.push(dto);
  }
  if (limit !== undefined) mapped = mapped.slice(0, limit);

  const countByStatus: Record<string, number> = {};
  for (const t of mapped) countByStatus[t.status ?? 'BACKLOG'] = (countByStatus[t.status ?? 'BACKLOG'] ?? 0) + 1;

  if (dryRun) {
    console.log('Count by status:', countByStatus);
    console.log('Skipped (Cancelada):', skippedCancelada);
    console.log('Skipped (unrecognized Estado):', skippedUnrecognized);
    console.log('First 3 mapped tasks:', JSON.stringify(mapped.slice(0, 3), null, 2));
    return;
  }

  const email = process.env.KANBAN_EMAIL;
  const password = process.env.KANBAN_PASSWORD;
  if (!email || !password) throw new Error('Missing KANBAN_EMAIL / KANBAN_PASSWORD env vars');

  const token = await login(email, password);
  const project = await getProjectBySlug(token, PROJECT_SLUG);

  for (const dto of mapped) {
    const task = await createTask(token, { ...dto, projectId: project.id });
    console.log(`created ${task.id} - ${task.title}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
