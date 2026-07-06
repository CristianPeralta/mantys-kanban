import { login, createTask } from './api';

describe('api client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  describe('login', () => {
    it('sends email/password and returns the accessToken', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: 'tok-123', user: { id: 'u1' } }),
      });
      global.fetch = mockFetch as any;

      const token = await login('alice@example.com', 'secret');

      expect(token).toBe('tok-123');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/login');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ email: 'alice@example.com', password: 'secret' });
    });
  });

  describe('createTask', () => {
    it('sends Authorization header and the task payload as JSON', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'task-1', title: 'Do the thing' }),
      });
      global.fetch = mockFetch as any;

      const result = await createTask('tok-123', { title: 'Do the thing', projectId: 'proj-1' });

      expect(result).toEqual({ id: 'task-1', title: 'Do the thing' });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/tasks');
      expect(options.headers.Authorization).toBe('Bearer tok-123');
      expect(JSON.parse(options.body)).toEqual({ title: 'Do the thing', projectId: 'proj-1' });
    });

    it('throws a useful error on a non-2xx response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'title is required',
      });
      global.fetch = mockFetch as any;

      await expect(createTask('tok-123', { title: '', projectId: 'proj-1' })).rejects.toThrow(
        /400.*title is required/s,
      );
    });
  });
});
