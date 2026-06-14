import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'auth-e2e@example.com',
    password: 'secret123',
    name: 'Auth E2E User',
  };

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
    // Clean up test user before each test to prevent duplicate email conflicts
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return 201 with user data (no password)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(HttpStatus.CREATED);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.name).toBe(testUser.name);
      expect(res.body.password).toBeUndefined();
    });

    it('should return 409 when email is already registered', async () => {
      // Register once
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(HttpStatus.CREATED);

      // Try to register again with same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(HttpStatus.CONFLICT);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Missing Fields' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create user before login tests
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
    });

    it('should return 200 with accessToken and user on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(HttpStatus.OK);

      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 401 when password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when email is unknown', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: testUser.password })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /auth/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and login to get token
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      accessToken = loginRes.body.accessToken;
    });

    it('should return 200 with user data when valid token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body.password).toBeUndefined();
    });

    it('should return 401 when no Authorization header is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when an invalid token is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
