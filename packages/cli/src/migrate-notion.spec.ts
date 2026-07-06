import { mapNotionTaskToCreateDto, ASSIGNEE_MAP, fetchAllPages, main, type NotionPage } from './migrate-notion';
import * as api from './api';

const mockRetrieve = jest.fn();
const mockQuery = jest.fn();

jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    databases: { retrieve: mockRetrieve },
    dataSources: { query: mockQuery },
  })),
}));

jest.mock('./api', () => ({
  login: jest.fn(),
  getProjectBySlug: jest.fn(),
  createTask: jest.fn(),
}));

function richText(text: string) {
  return text ? [{ plain_text: text }] : [];
}

function page(overrides: {
  title?: string;
  estado?: string;
  prioridad?: string;
  fechaLimite?: string;
  notas?: string;
  paraQue?: string;
  responsable?: string;
}): NotionPage {
  return {
    properties: {
      Tarea: { title: richText(overrides.title ?? 'Sample task') },
      Estado: overrides.estado ? { select: { name: overrides.estado } } : { select: null },
      Prioridad: overrides.prioridad ? { select: { name: overrides.prioridad } } : { select: null },
      'Fecha limite': overrides.fechaLimite ? { date: { start: overrides.fechaLimite } } : { date: null },
      Notas: { rich_text: richText(overrides.notas ?? '') },
      'Para qué': { rich_text: richText(overrides.paraQue ?? '') },
      Responsable: overrides.responsable ? { select: { name: overrides.responsable } } : { select: null },
    },
  };
}

describe('mapNotionTaskToCreateDto', () => {
  describe('status mapping', () => {
    it.each([
      ['Backlog', 'BACKLOG'],
      ['Por hacer', 'TODO'],
      ['En progreso', 'IN_PROGRESS'],
      ['En Revision', 'REVIEW'],
      ['Hecho', 'DONE'],
      ['Bloqueado', 'IN_PROGRESS'],
    ])('maps Estado "%s" to status %s', (estado, expected) => {
      const dto = mapNotionTaskToCreateDto(page({ estado }));
      expect(dto?.status).toBe(expected);
    });

    it('returns null (skip) for Cancelada', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Cancelada' }));
      expect(dto).toBeNull();
    });

    it('returns null and warns for an unrecognized Estado value', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Some New Column' }));
      expect(dto).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Some New Column'));
      warn.mockRestore();
    });
  });

  describe('priority mapping', () => {
    it.each([
      ['Alta', 'A'],
      ['P1', 'A'],
      ['Media', 'B'],
      ['P2', 'B'],
      ['Baja', 'C'],
    ])('maps Prioridad "%s" to priority %s', (prioridad, expected) => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', prioridad }));
      expect(dto?.priority).toBe(expected);
    });

    it('defaults to A when Prioridad is empty', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog' }));
      expect(dto?.priority).toBe('A');
    });

    it('defaults to A and warns for an unrecognized Prioridad value', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', prioridad: 'Urgentisima' }));
      expect(dto?.priority).toBe('A');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Urgentisima'));
      warn.mockRestore();
    });
  });

  describe('description concatenation', () => {
    it('joins Notas and Para qué with a blank line', () => {
      const dto = mapNotionTaskToCreateDto(
        page({ estado: 'Backlog', notas: 'nota importante', paraQue: 'para avanzar el proyecto' }),
      );
      expect(dto?.description).toBe('nota importante\n\npara avanzar el proyecto');
    });

    it('skips empty parts', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', notas: 'solo nota' }));
      expect(dto?.description).toBe('solo nota');
    });

    it('is undefined when both are empty', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog' }));
      expect(dto?.description).toBeUndefined();
    });
  });

  describe('deadline mapping', () => {
    it('converts a Notion date-only string to full ISO-8601 (Prisma requires it)', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', fechaLimite: '2026-06-03' }));
      expect(dto?.deadline).toBe(new Date('2026-06-03').toISOString());
    });

    it('is undefined when Fecha limite is empty', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog' }));
      expect(dto?.deadline).toBeUndefined();
    });
  });

  describe('assignee lookup', () => {
    it('maps Cristian via ASSIGNEE_MAP', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', responsable: 'Cristian' }));
      expect(dto?.assigneeId).toBe(ASSIGNEE_MAP.Cristian);
    });

    it('maps Socia via ASSIGNEE_MAP', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', responsable: 'Socia' }));
      expect(dto?.assigneeId).toBe(ASSIGNEE_MAP.Socia);
    });

    it('resolves to undefined for Ambos', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog', responsable: 'Ambos' }));
      expect(dto?.assigneeId).toBeUndefined();
    });

    it('resolves to undefined when empty', () => {
      const dto = mapNotionTaskToCreateDto(page({ estado: 'Backlog' }));
      expect(dto?.assigneeId).toBeUndefined();
    });
  });
});

describe('fetchAllPages', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('collects results across paginated responses and stops when has_more is false', async () => {
    mockQuery
      .mockResolvedValueOnce({
        results: [{ properties: {} }],
        has_more: true,
        next_cursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        results: [{ properties: {} }, { properties: {} }],
        has_more: false,
        next_cursor: null,
      });

    const notion = { dataSources: { query: mockQuery } } as any;
    const pages = await fetchAllPages(notion, 'ds-id');

    expect(pages).toHaveLength(3);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(1, { data_source_id: 'ds-id', start_cursor: undefined });
    expect(mockQuery).toHaveBeenNthCalledWith(2, { data_source_id: 'ds-id', start_cursor: 'cursor-2' });
  });
});

describe('main() dry-run vs write dispatch', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NOTION_TOKEN: 'test-token',
      KANBAN_EMAIL: 'user@example.com',
      KANBAN_PASSWORD: 'secret',
    };
    mockRetrieve.mockResolvedValue({ data_sources: [{ id: 'ds-1' }] });
    mockQuery.mockResolvedValue({
      results: [
        {
          properties: {
            Tarea: { title: [{ plain_text: 'Task 1' }] },
            Estado: { select: { name: 'Backlog' } },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it('never calls login/createTask when --dry-run is passed', async () => {
    process.argv = ['node', 'migrate-notion.js', '--dry-run'];

    await main();

    expect(api.login).not.toHaveBeenCalled();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it('calls login and createTask for each mapped task without --dry-run', async () => {
    process.argv = ['node', 'migrate-notion.js'];
    (api.login as jest.Mock).mockResolvedValue('token-123');
    (api.getProjectBySlug as jest.Mock).mockResolvedValue({ id: 'project-1' });
    (api.createTask as jest.Mock).mockResolvedValue({ id: 'task-1', title: 'Task 1' });

    await main();

    expect(api.login).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(api.createTask).toHaveBeenCalledTimes(1);
  });

  it('respects --limit=N and only creates the first N mapped tasks', async () => {
    mockQuery.mockResolvedValue({
      results: [
        {
          properties: {
            Tarea: { title: [{ plain_text: 'Task 1' }] },
            Estado: { select: { name: 'Backlog' } },
          },
        },
        {
          properties: {
            Tarea: { title: [{ plain_text: 'Task 2' }] },
            Estado: { select: { name: 'Backlog' } },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    process.argv = ['node', 'migrate-notion.js', '--limit=1'];
    (api.login as jest.Mock).mockResolvedValue('token-123');
    (api.getProjectBySlug as jest.Mock).mockResolvedValue({ id: 'project-1' });
    (api.createTask as jest.Mock).mockResolvedValue({ id: 'task-1', title: 'Task 1' });

    await main();

    expect(api.createTask).toHaveBeenCalledTimes(1);
    expect(api.createTask).toHaveBeenCalledWith(
      'token-123',
      expect.objectContaining({ title: 'Task 1' }),
    );
  });
});
