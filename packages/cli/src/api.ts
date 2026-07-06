// Thin fetch-based client for the MANTYS kanban API.
// Deviation from spec: @mantys/types' CreateTaskDto has no `status` field even
// though the API (apps/api/src/dto/create-task.dto.ts) accepts it on create.
// CreateTaskInput below is the CLI's own shape (superset) instead of reusing
// CreateTaskDto directly.
import type { Project, Task, Priority, TaskStatus } from '@mantys/types';

const BASE_URL = process.env.KANBAN_API_URL ?? 'https://api.mantys.studio';

export interface CreateTaskInput {
  title: string;
  projectId: string;
  description?: string;
  priority?: Priority;
  status?: TaskStatus;
  deadline?: string;
  assigneeId?: string;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<string> {
  const { accessToken } = await request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return accessToken;
}

export function listProjects(token: string): Promise<Project[]> {
  return request<Project[]>('/projects', { token });
}

export function getProjectBySlug(token: string, slug: string): Promise<Project> {
  return request<Project>(`/projects/by-slug/${slug}`, { token });
}

export function createProject(token: string, name: string, description?: string): Promise<Project> {
  return request<Project>('/projects', { method: 'POST', token, body: { name, description } });
}

export function listTasks(token: string, projectId: string): Promise<Task[]> {
  return request<Task[]>(`/tasks?projectId=${projectId}`, { token });
}

export function createTask(token: string, dto: CreateTaskInput): Promise<Task> {
  return request<Task>('/tasks', { method: 'POST', token, body: dto });
}

export function updateTask(token: string, id: string, patch: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/tasks/${id}`, { method: 'PUT', token, body: patch });
}
