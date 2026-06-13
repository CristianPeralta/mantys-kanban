/**
 * Test suite: TasksController (e2e)
 *
 * End-to-end tests for the TasksController.
 * Requires a real PostgreSQL database (see docker-compose.yml).
 * Before running: DATABASE_URL must be set and `prisma migrate deploy` must have run.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as request from 'supertest';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testProjectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Final cleanup before shutting down
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean up and seed a test project before each test
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});

    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    });
    testProjectId = project.id;
  });

  // Helper to build a valid createTaskDto using the seeded project
  const buildCreateDto = () => ({
    title: 'New Task',
    projectId: testProjectId,
  });

  const createNewTask = (app: INestApplication) =>
    request(app.getHttpServer()).post('/tasks').send(buildCreateDto());

  /**
   * GET /tasks
   */
  describe('/tasks (GET)', () => {
    it('should return an array of tasks', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });

  /**
   * POST /tasks
   */
  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      await createNewTask(app)
        .expect(HttpStatus.CREATED)
        .then((response) => {
          const createdTask = response.body;
          expect(createdTask.id).toBeDefined();
          expect(createdTask.title).toBe('New Task');
          expect(createdTask.projectId).toBe(testProjectId);
        });
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'No project id' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  /**
   * GET /tasks/:id
   */
  describe('/tasks/:id (GET)', () => {
    it('should return a task if it exists', async () => {
      const createdTaskResponse = await createNewTask(app);
      const taskId = createdTaskResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(taskId);
    });

    it('should return 404 if the task does not exist', async () => {
      await request(app.getHttpServer())
        .get('/tasks/nonexistent-cuid-id')
        .expect(HttpStatus.NOT_FOUND)
        .expect((response) => {
          expect(response.body.message).toBe('Task does not exist');
        });
    });
  });

  /**
   * PUT /tasks/:id
   */
  describe('/tasks/:id (PUT)', () => {
    it('should update a task successfully', async () => {
      const createdTaskResponse = await createNewTask(app);
      const taskId = createdTaskResponse.body.id;

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send({ title: 'Updated Task' })
        .expect(HttpStatus.OK);

      expect(response.body.title).toBe('Updated Task');
      expect(response.body.id).toBe(taskId);
    });

    it('should return 404 if task does not exist', async () => {
      const response = await request(app.getHttpServer())
        .put('/tasks/nonexistent-cuid-id')
        .send({ title: 'Updated Task' })
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Task does not exist');
    });
  });

  /**
   * DELETE /tasks/:id
   */
  describe('DELETE /tasks/:id', () => {
    it('should delete a task and return 204 status code', async () => {
      const createdTaskResponse = await createNewTask(app);
      const taskId = createdTaskResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when trying to delete a non-existent task', async () => {
      const response = await request(app.getHttpServer())
        .delete('/tasks/nonexistent-cuid-id')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Task does not exist');
    });
  });
});
