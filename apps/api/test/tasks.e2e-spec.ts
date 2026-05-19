/**
 * Test suite: TasksController (e2e)
 *
 * Description:
 * This test suite contains end-to-end (e2e) tests for the TasksController class.
 * It tests the behavior of the API endpoints exposed by the controller.
 * The tests verify the correct handling of HTTP requests, data validation, and database operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import * as request from 'supertest';
import mongoose from 'mongoose';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: mongoose.Connection;

  // Executed before all tests
  beforeAll(async () => {
    // Create a testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Get the Mongoose connection
    mongooseConnection = moduleFixture.get<mongoose.Connection>(
      getConnectionToken(),
    );

    // Drop the database to start with a clean slate
    await mongooseConnection.dropDatabase();

    // Create the Nest application
    app = moduleFixture.createNestApplication();
    // Apply global validation pipe for data validation
    app.useGlobalPipes(new ValidationPipe());

    // Initialize the application
    await app.init();
  });

  // Executed after all tests
  afterAll(async () => {
    // Close the Mongoose connection
    await mongooseConnection.close();
    // Close the Nest application
    await app.close();
  });

  // Executed before each test
  beforeEach(async () => {
    // Delete all documents in the 'tasks' collection
    await mongooseConnection.collection('tasks').deleteMany({});
  });

  // Define the DTOs for creating and updating tasks
  const createTaskDto = {
    title: 'New Task',
  };

  const updateTaskDto = {
    title: 'Updated Task',
    done: true,
  };

  // Helper function to create a new task via API request
  const createNewTask = () =>
    request(app.getHttpServer()).post('/tasks').send(createTaskDto);

  // Helper function to generate a non-existent task ID
  const nonExistentTaskIdGenerated = () =>
    new mongoose.Types.ObjectId().toHexString();

  /**
   * Test suite: /tasks (GET) endpoint
   *
   * Description:
   * This test suite contains unit tests for the GET endpoint '/tasks'.
   * It verifies the behavior of the endpoint when retrieving tasks.
   */
  describe('/tasks (GET)', () => {
    /**
     * Test case: should return an array of tasks
     *
     * Description:
     * This test case verifies that the GET endpoint '/tasks' returns an array of tasks.
     * It sends a GET request to the endpoint and expects a response with status code 200 (OK).
     * Additionally, it checks that the response body is an array.
     */
    it('should return an array of tasks', () => {
      // Arrange: No additional arrangements needed for this test case

      // Act: Send a GET request to the '/tasks' endpoint
      return (
        request(app.getHttpServer())
          .get('/tasks')

          // Assert: Verify the response status code and response body
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(Array.isArray(response.body)).toBe(true);
          })
      );
    });
  });

  /**
   * Test case: POST /tasks
   *
   * Description:
   * This test case verifies the behavior of the POST endpoint '/tasks' for creating a new task.
   * It sends a POST request to the endpoint with a task payload, and expects a response with status code 201 (Created)
   * and the created task object in the response body.
   */
  describe('POST /tasks', () => {
    /**
     * Test case: should create a new task
     *
     * Description:
     * This test case verifies the behavior of creating a new task by sending a POST request to the '/tasks' endpoint.
     * It expects a response with status code 201 (Created) and validates the created task object in the response body.
     */
    it('should create a new task', async () => {
      // Arrange: Create a new task using the createNewTask function

      // Act: Send a POST request to the '/tasks' endpoint and await the response
      await createNewTask()
        // Assert: Verify the response status code and the created task object in the response body
        .expect(HttpStatus.CREATED)
        .then((response) => {
          const createdTask = response.body;
          expect(response.body._id).toBeDefined();
          expect(createdTask.title).toBe(createTaskDto.title);
          expect(createdTask.done).toBe(false);
        });
    });

    /**
     * Test case: should return ConflictException if task already exists
     *
     * Description:
     * This test case verifies the behavior when attempting to create a task that already exists.
     * It first creates a task using the createNewTask function, and then tries to create the same task again.
     * It expects a response with status code 409 (Conflict) and validates the error message in the response body.
     */
    it('should return ConflictException if task already exists', async () => {
      // Arrange: Create a new task using the createNewTask function
      await createNewTask();
      // Act: Send a POST request to the '/tasks' endpoint to create the same task again, and await the response
      await createNewTask()
        // Assert: Verify the response status code and the error message in the response body
        .expect(HttpStatus.CONFLICT)
        .expect((response) => {
          expect(response.body.message).toBeDefined();
          const errorMessage = response.body.message;
          expect(errorMessage).toBe('Task already exists');
        });
    });
  });

  /**
   * Test suite: GET /tasks/:id
   *
   * Description:
   * This test suite contains tests for retrieving a task by its ID.
   * It verifies the behavior of the endpoint when a valid ID is provided,
   * as well as when an invalid ID is provided.
   */
  describe('/tasks/:id (GET)', () => {
    /**
     * Test case: should return a task if it exists
     *
     * Description:
     * This test case verifies that the '/tasks/:id' endpoint returns a task
     * when a valid ID of an existing task is provided.
     */
    it('should return a task if it exists', async () => {
      // Arrange: Create a new task and retrieve its ID
      const createdTaskResponse = await createNewTask();
      const taskId = createdTaskResponse.body._id;

      // Act: Send a GET request to the '/tasks/:id' endpoint with the valid ID, and await the response
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        // Assert: Verify the response status code is 200
        .expect(HttpStatus.OK);

      // Assert: Verify the response body contains the task with the correct ID
      expect(response.body._id).toBeDefined();
      expect(response.body._id).toBe(taskId);
    });

    /**
     * Test case: should return 404 if the task does not exist
     *
     * Description:
     * This test case verifies that the '/tasks/:id' endpoint returns a 404 status code
     * and an error message when an invalid or non-existent task ID is provided.
     */
    it('should return 404 if the task does not exist', async () => {
      // Arrange: Generate a non-existent task ID
      const nonExistentTaskId = nonExistentTaskIdGenerated();

      // Act: Send a GET request to the '/tasks/:id' endpoint with the non-existent ID, and await the response
      await request(app.getHttpServer())
        .get(`/tasks/${nonExistentTaskId}`)
        // Assert: Verify the response body contains an error message indicating the task does not exist
        .expect(HttpStatus.NOT_FOUND)
        .expect((response) => {
          expect(response.body.message).toBeDefined();
          const errorMessage = response.body.message;
          expect(errorMessage).toBe('Task does not exist');
        });
    });
  });

  /**
   * Test suite: /tasks/:id (PUT)
   *
   * Description:
   * This test suite contains test cases for the '/tasks/:id' endpoint with the PUT method.
   * It verifies the behavior of updating a task by ID.
   */
  describe('/tasks/:id (PUT)', () => {
    /**
     * Test case: should update a task successfully
     *
     * Description:
     * This test case verifies that the '/tasks/:id' endpoint successfully updates a task
     * with the provided ID and returns the updated task object.
     */
    it('should update a task successfully', async () => {
      // Arrange: Create a new task and retrieve its ID
      const createdTaskResponse = await createNewTask();
      const taskId = createdTaskResponse.body._id;

      // Act: Send a PUT request to the '/tasks/:id' endpoint with the task ID and updated task data, and await the response
      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send(updateTaskDto)
        // Assert: Verify the response status code is 200
        .expect(HttpStatus.OK);

      // Assert: Verify the response body matches the updated task object
      expect(response.body.title).toBe(updateTaskDto.title);
      expect(response.body.done).toBe(updateTaskDto.done);
    });

    /**
     * Test case: should return 404 if task does not exist
     *
     * Description:
     * This test case verifies that the '/tasks/:id' endpoint returns a 404 status code
     * and an error message when attempting to update a non-existent task.
     */
    it('should return 404 if task does not exist', async () => {
      // Arrange: Generate a non-existent task ID
      const nonExistentTaskId = nonExistentTaskIdGenerated();

      // Act: Send a PUT request to the '/tasks/:id' endpoint with the non-existent ID and updated task data, and await the response
      const response = await request(app.getHttpServer())
        .put(`/tasks/${nonExistentTaskId}`)
        .send(updateTaskDto)
        // Assert: Verify the response status code is 404
        .expect(HttpStatus.NOT_FOUND);

      // Assert: Verify the response body contains an error message indicating the task does not exist
      expect(response.body.message).toBe('Task does not exist');
    });
  });

  /**
   * Test suite: DELETE /tasks/:id
   *
   * Description:
   * This test suite contains test cases for the DELETE /tasks/:id endpoint.
   * It verifies the behavior of deleting a task by its ID.
   */
  describe('DELETE /tasks/:id', () => {
    /**
     * Test case: should delete a task and return 204 status code
     *
     * Description:
     * This test case verifies that the DELETE /tasks/:id endpoint deletes a task by its ID
     * and returns a 204 No Content status code. It also ensures that the deleted task is no longer
     * accessible via the GET /tasks/:id endpoint, returning a 404 status code.
     */
    it('should delete a task and return 204 status code', async () => {
      // Arrange: Create a new task and retrieve its ID
      const createdTaskResponse = await createNewTask();
      const taskId = createdTaskResponse.body._id;

      // Act: Send a DELETE request to the '/tasks/:id' endpoint with the task ID, and await the response
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        // Assert: Verify the response status code is 204
        .expect(HttpStatus.NO_CONTENT);

      // Verify that the task is no longer accessible via the GET endpoint
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    /**
     * Test case: should return 404 status code when trying to delete a non-existent task
     *
     * Description:
     * This test case verifies that the DELETE /tasks/:id endpoint returns a 404 status code
     * and an error message when attempting to delete a task with an invalid or non-existent ID.
     */
    it('should return 404 status code when trying to delete a non-existent task', async () => {
      // Arrange: Generate a non-existent task ID
      const nonExistentTaskId = nonExistentTaskIdGenerated();

      // Act: Send a DELETE request to the '/tasks/:id' endpoint with the non-existent ID, and await the response
      const response = await request(app.getHttpServer())
        .delete(`/tasks/${nonExistentTaskId}`)
        // Assert: Verify the response status code is 404
        .expect(HttpStatus.NOT_FOUND);

      // Verify that the response body contains an error message indicating the task does not exist
      expect(response.body.message).toBe('Task does not exist');
    });
  });
});
