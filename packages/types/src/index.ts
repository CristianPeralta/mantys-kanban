// Enums

export enum Role {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum Priority {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

// Entities

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  deadline?: Date;
  assigneeId?: string;
  assignee?: Pick<User, 'id' | 'name' | 'email'>;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Auth

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// API request shapes

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  assigneeId?: string;
  projectId: string;
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}
