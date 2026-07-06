#!/usr/bin/env node
import { parseArgs } from 'node:util';
import {
  login,
  listProjects,
  getProjectBySlug,
  listTasks,
  createTask,
  updateTask,
} from './api';

function usageAndExit(message?: string): never {
  if (message) console.error(message);
  console.error(`Usage:
  mantys-kanban project list
  mantys-kanban task create --project <slug> --title <title> [--status S] [--priority P] [--deadline ISO] [--assignee <id>] [--description <d>]
  mantys-kanban task list --project <slug> [--status S]
  mantys-kanban task move <id> <STATUS>`);
  process.exit(1);
}

async function requireToken(): Promise<string> {
  const email = process.env.KANBAN_EMAIL;
  const password = process.env.KANBAN_PASSWORD;
  if (!email || !password) {
    usageAndExit('Missing KANBAN_EMAIL / KANBAN_PASSWORD env vars');
  }
  return login(email, password);
}

async function main() {
  const [resource, action, ...rest] = process.argv.slice(2);

  if (resource === 'project' && action === 'list') {
    const token = await requireToken();
    const projects = await listProjects(token);
    for (const p of projects) console.log(`${p.name}\t${p.slug}\t${p.id}`);
    return;
  }

  if (resource === 'task' && action === 'create') {
    const { values } = parseArgs({
      args: rest,
      options: {
        project: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
        deadline: { type: 'string' },
        assignee: { type: 'string' },
        description: { type: 'string' },
      },
    });
    if (!values.project || !values.title) {
      usageAndExit('task create requires --project and --title');
    }
    const token = await requireToken();
    const project = await getProjectBySlug(token, values.project);
    const task = await createTask(token, {
      title: values.title,
      projectId: project.id,
      status: values.status as any,
      priority: values.priority as any,
      deadline: values.deadline,
      assigneeId: values.assignee,
      description: values.description,
    });
    console.log(task.id);
    return;
  }

  if (resource === 'task' && action === 'list') {
    const { values } = parseArgs({
      args: rest,
      options: {
        project: { type: 'string' },
        status: { type: 'string' },
      },
    });
    if (!values.project) {
      usageAndExit('task list requires --project');
    }
    const token = await requireToken();
    const project = await getProjectBySlug(token, values.project);
    let tasks = await listTasks(token, project.id);
    if (values.status) tasks = tasks.filter((t) => t.status === values.status);
    for (const t of tasks) console.log(`${t.id}\t${t.status}\t${t.priority}\t${t.title}`);
    return;
  }

  if (resource === 'task' && action === 'move') {
    const [id, status] = rest;
    if (!id || !status) {
      usageAndExit('task move requires <id> <STATUS>');
    }
    const token = await requireToken();
    await updateTask(token, id, { status: status as any });
    console.log(`${id} -> ${status}`);
    return;
  }

  usageAndExit(`Unknown command: ${[resource, action].filter(Boolean).join(' ')}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
