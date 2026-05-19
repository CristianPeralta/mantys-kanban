/**
 * Test suite: Task Service
 *
 * Description:
 * This test suite contains unit tests for the methods of the TasksService class.
 * It verifies the behavior of the create(), findOne(), findAll(), update(), and delete()
 * methods when working with tasks.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { Task, TaskSchema } from '../schemas/task.schema';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import { CreateTaskDto } from '../dto/create-task.dto';

describe('Task Service', () => {
  let taskService: TasksService;
  let mongod: MongoMemoryServer;
  let mongooseConnection: mongoose.Connection;

  // Executed before all tests
  beforeAll(async () => {
    // Initialize MongoMemoryServer
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    // Create a testing module
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Configure the in-memory database connection
        MongooseModule.forRoot(mongoUri),
        // Import the Task schema
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
      ],
      providers: [TasksService], // Include the service to be tested
    }).compile();

    // Get an instance of the TasksService
    taskService = module.get<TasksService>(TasksService);

    // Get the database connection
    mongooseConnection = module.get<mongoose.Connection>(getConnectionToken());
  });

  // Executed before each test
  beforeEach(async () => {
    // Clear the database before each test
    await mongooseConnection.dropDatabase();
  });

  // Executed after all tests
  afterAll(async () => {
    // Stop the MongoMemoryServer and close the database connection
    await mongod.stop();
    await mongooseConnection.close();
  });

  it('should be defined', () => {
    // Ensure that the task service is defined
    expect(taskService).toBeDefined();
  });

  /**
   * Test suite: Tasks Service
   *
   * Description:
   * This test suite contains unit tests for the methods of the TasksService class.
   * It verifies the behavior of the create(), findOne(), findAll(), update(), and delete()
   * methods when working with tasks.
   */
  describe('Tasks Service', () => {
    /**
     * Test case: create
     *
     * Description:
     * This test case verifies that the create() method of the TasksService class
     * correctly creates a new task with the provided parameters.
     */
    describe('create', () => {
      /**
       * Test case: should not create Task without arguments
       *
       * Description:
       * This test case ensures that the taskService.create() method throws a ValidationError
       * when called without any arguments. It expects the error object to have a specific structure
       * and the 'title' property to be required.
       */
      it('should not create Task without arguments', async () => {
        // Attempt to create a task without arguments
        // and expect a validation error to be thrown

        // Arrange
        const callWithoutArguments = taskService.create.bind(taskService);

        // Act
        try {
          await callWithoutArguments();
        } catch (error) {
          error = error as Error;

          // Assert
          expect(error.name).toEqual('ValidationError');
          expect(error.errors).not.toBeNull();
          expect(error.errors.title).not.toBeNull();
          expect(error.errors.title.message).toEqual(
            'Path `title` is required.',
          );
        }
      });

      /**
       * Test case: should not create Task with falsy params
       *
       * Description:
       * This test case ensures that the taskService.create() method throws a ValidationError
       * when called with falsy parameters, such as null. It expects the error object to have
       * a specific structure and the 'title' property to be required.
       */
      it('should not create Task with falsy params', async () => {
        // Arrange
        const taskData = null;

        // Act
        expect.assertions(4);
        try {
          await taskService.create(taskData);
        } catch (error) {
          error = error as Error;

          // Assert
          expect(error.name).toEqual('ValidationError');
          expect(error.errors).not.toBeNull();
          expect(error.errors.title).not.toBeNull();
          expect(error.errors.title.message).toEqual(
            'Path `title` is required.',
          );
        }
      });

      /**
       * Test case: should not create Task without title
       *
       * Description:
       * This test case ensures that the taskService.create() method throws a ValidationError
       * when called without providing a title in the CreateTaskDto object. It expects the error
       * object to have a specific structure and the 'title' property to be required, with a
       * specific error message.
       */
      it('should not create Task without title', async () => {
        // Arrange
        const taskData = {
          description: 'sample description',
        } as CreateTaskDto;

        try {
          // Act
          // Attempt to create a task without a title
          await taskService.create(taskData);
        } catch (error) {
          error = error as Error;

          // Assert
          expect(error.name).toEqual('ValidationError');
          expect(error.errors).not.toBeNull();
          expect(error.errors.title).not.toBeNull();
          expect(error.errors.title.message).toEqual(
            'Path `title` is required.',
          );
        }
      });

      /**
       * Test case: should create Task with only a title
       *
       * Description:
       * This test case ensures that the taskService.create() method successfully creates a task
       * when called with only a title provided in the CreateTaskDto object. It expects the
       * created task to have the correct properties and default values.
       */
      it('should create Task with only a title', async () => {
        // Arrange
        const taskData = {
          title: 'sample title',
        };

        // Act
        const task = await taskService.create(taskData);

        // Assert
        expect(task).toBeDefined();
        expect(task._id).toBeDefined();
        expect(task.title).toEqual('sample title');
        expect(task.done).toEqual(false); // default value
      });

      /**
       * Test case: should create Task with title, description and done properties
       *
       * Description:
       * This test case ensures that the taskService.create() method successfully creates a task
       * when called with a title, description, and done properties provided in the CreateTaskDto object.
       * It expects the created task to have the correct properties and values.
       */
      it('should create Task with title, description and done properties', async () => {
        // Arrange
        const taskData = {
          title: 'sample title',
          description: 'sample description',
          done: true,
        };

        // Act
        const task = await taskService.create(taskData);

        // Assert
        expect(task).toBeDefined();
        expect(task._id).toBeDefined();
        expect(task.title).toEqual('sample title');
        expect(task.description).toEqual('sample description');
        expect(task.done).toEqual(true);
      });
    });

    /**
     * Test case: findOne
     *
     * Description:
     * This test case verifies that the findOne() method of the TasksService class
     * retrieves a task by its ID.
     */
    describe('findOne', () => {
      /**
       * Test case: should get a Task by ID
       *
       * Description:
       * This test case verifies that the taskService.findOne() method retrieves a task
       * with the specified ID. It creates a task, obtains its ID, and then fetches the task
       * using the findOne() method. It asserts that the retrieved task is defined, not null,
       * has a valid ID, and has the expected title.
       */
      it('should get a Task by ID', async () => {
        // Arrange
        const task = await taskService.create({
          title: 'sample title',
        });

        // Act
        const createdTask = await taskService.findOne(String(task._id));

        // Assert
        expect(createdTask).toBeDefined();
        expect(createdTask).not.toBeNull();
        expect(createdTask._id).toBeDefined();
        expect(createdTask._id).toStrictEqual(task._id);
        expect(task.title).toEqual('sample title');
      });

      /**
       * Test case: should return null for non-existing ID
       *
       * Description:
       * This test case verifies that the taskService.findOne() method returns null
       * when a non-existing ID is provided. It generates a new random ID, passes it
       * to the findOne() method, and asserts that the result is null.
       */
      it('should return null for non-existing ID', async () => {
        // Arrange
        const nonExistingId = new mongoose.Types.ObjectId().toHexString();

        // Act
        const result = await taskService.findOne(String(nonExistingId));

        // Assert
        expect(result).toBeNull();
      });
    });

    /**
     * Test case: findAll
     *
     * Description:
     * This test case verifies that the findAll() method of the TasksService class
     * retrieves all tasks.
     */
    describe('findAll', () => {
      /**
       * Test case: should return an empty array when no tasks exist
       *
       * Description:
       * This test case ensures that the taskService.findAll() method returns an
       * empty array when there are no tasks in the database. It calls the findAll()
       * method and asserts that the result is an array with a length of 0.
       */
      it('should return an empty array when no tasks exist', async () => {
        // Act
        const tasks = await taskService.findAll();

        // Assert
        expect(tasks).toBeDefined();
        expect(tasks).toBeInstanceOf(Array);
        expect(tasks.length).toBe(0);
      });

      /**
       * Test case: should get all tasks
       *
       * Description:
       * This test case ensures that the taskService.findAll() method returns all the
       * tasks in the database. It creates three tasks with different titles, calls
       * the findAll() method, and asserts that the result is an array with a length of 3.
       */
      it('should get all tasks', async () => {
        // Arrange
        await Promise.all(
          ['title 1', 'title 2', 'title 3'].map((t) =>
            taskService.create({
              title: t,
            }),
          ),
        );

        // Act
        const tasks = await taskService.findAll();

        // Assert
        expect(tasks).toBeDefined();
        expect(tasks).not.toBeNull();
        expect(tasks).toBeInstanceOf(Array);
        expect(tasks.length).toBe(3);
      });
    });

    /**
     * Test case: update
     *
     * Description:
     * This test case verifies that the update() method of the TasksService class
     * updates a task with the provided parameters.
     */
    describe('update', () => {
      /**
       * Test case: should update a Task
       *
       * Description:
       * This test case ensures that the taskService.update() method successfully updates
       * a task in the database. It creates a task with a sample title, calls the update()
       * method with new task updates, and asserts that the returned task has been updated
       * with the correct values.
       */
      it('should update a Task', async () => {
        // Arrange
        const task = await taskService.create({
          title: 'sample title',
        });
        const taskUpdates = {
          title: 'updated title',
          description: 'updated description',
          done: true,
        };

        // Act
        const updatedTask = await taskService.update(
          String(task._id),
          taskUpdates,
        );

        // Assert
        expect(updatedTask).toBeDefined();
        expect(updatedTask._id).toBeDefined();
        expect(updatedTask._id).toStrictEqual(task._id);
        expect(updatedTask.title).toBe(taskUpdates.title);
        expect(updatedTask.description).toBe(taskUpdates.description);
        expect(updatedTask.done).toBe(taskUpdates.done);
      });

      /**
       * Test case: should return null for non-existing ID
       *
       * Description:
       * This test case ensures that the taskService.update() method returns null
       * when attempting to update a task with a non-existing ID. It generates a
       * non-existing ID, calls the update() method with task updates, and asserts
       * that the returned value is null.
       */
      it('should return null for non-existing ID', async () => {
        // Arrange
        const taskUpdates = {
          title: 'updated title',
          description: 'updated description',
          done: true,
        };
        const nonExistingId = new mongoose.Types.ObjectId().toHexString();

        // Act
        const updatedTask = await taskService.update(
          String(nonExistingId),
          taskUpdates,
        );

        // Assert
        expect(updatedTask).toBeNull();
      });
    });

    /**
     * Test case: delete
     *
     * Description:
     * This test case verifies that the delete() method of the TasksService class
     * deletes a task with the specified ID.
     */
    describe('delete', () => {
      /**
       * Test case: should delete a Task
       *
       * Description:
       * This test case ensures that the taskService.delete() method successfully deletes a task.
       * It creates a new task, calls the delete() method with the task's ID, and asserts that the
       * returned deleted task object has the same ID. It also checks that the task is no longer
       * found when attempting to retrieve it after deletion.
       */
      it('should delete a Task', async () => {
        // Arrange
        const task = await taskService.create({
          title: 'sample title',
        });

        // Act
        const deletedTask = await taskService.delete(String(task._id));

        // Assert
        expect(deletedTask).toBeDefined();
        expect(deletedTask._id).toBeDefined();
        expect(deletedTask._id).toStrictEqual(task._id);

        // Check if task is no longer found
        const result = await taskService.findOne(String(deletedTask._id));
        expect(result).toBeNull();
      });

      /**
       * Test case: should return null for non-existing ID
       *
       * Description:
       * This test case ensures that the taskService.delete() method returns null when
       * called with a non-existing task ID. It generates a random non-existing ID, calls
       * the delete() method with that ID, and expects the result to be null.
       */
      it('should return null for non-existing ID', async () => {
        // Arrange
        const nonExistingId = new mongoose.Types.ObjectId().toHexString();

        // Act
        const result = await taskService.delete(String(nonExistingId));

        // Assert
        expect(result).toBeNull();
      });
    });
  });
});
