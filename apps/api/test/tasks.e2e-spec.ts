import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    const project = await prisma.project.create({ data: { name: 'Test Project' } });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await app.close();
  });

  describe('/tasks (GET)', () => {
    it('should return an array of tasks', async () => {
      await prisma.task.create({ data: { title: 'Task 1', projectId } });
      await prisma.task.create({ data: { title: 'Task 2', projectId } });

      const res = await request(app.getHttpServer()).get('/tasks').expect(HttpStatus.OK);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const dto = { title: 'New Task', projectId };

      const res = await request(app.getHttpServer())
        .post('/tasks')
        .send(dto)
        .expect(HttpStatus.CREATED);

      expect(res.body.title).toBe('New Task');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ projectId })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/tasks/:id (GET)', () => {
    it('should return a task by id', async () => {
      const task = await prisma.task.create({ data: { title: 'Find Me', projectId } });

      const res = await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Find Me');
    });
  });

  describe('/tasks/:id (PUT)', () => {
    it('should update a task', async () => {
      const task = await prisma.task.create({ data: { title: 'Old Title', projectId } });

      const res = await request(app.getHttpServer())
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title' })
        .expect(HttpStatus.OK);

      expect(res.body.title).toBe('New Title');
    });
  });

  describe('/tasks/:id (DELETE)', () => {
    it('should delete a task', async () => {
      const task = await prisma.task.create({ data: { title: 'To Delete', projectId } });

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .expect(HttpStatus.OK);

      const found = await prisma.task.findUnique({ where: { id: task.id } });
      expect(found).toBeNull();
    });
  });
});
