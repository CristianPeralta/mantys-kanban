/**
 * Test suite: Task Controller
 *
 * Description:
 * This test suite contains unit tests for the methods of the TasksController class.
 * It verifies the behavior of the create(), findOne(), findAll(), update(), and delete()
 * methods when handling requests related to tasks.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from '../schemas/task.schema';
import { getModelToken } from '@nestjs/mongoose';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

describe('Task Controller', () => {
  let tasksController: TasksController;
  let tasksService: TasksService;

  // Executed before all tests
  beforeAll(async () => {
    // Create a testing module
    const module: TestingModule = await Test.createTestingModule({
      // Register the TasksController as the controller to be tested
      controllers: [TasksController],
      providers: [
        // Register the TasksService as a provider
        TasksService,
        {
          // Specify the injection token for the Task model
          provide: getModelToken('Task'),
          // Use the Task schema as the value for the injection token
          useValue: Task,
        },
      ],
    }).compile();

    // Retrieve instances of TasksController and TasksService from the testing module
    tasksController = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  // Test case: should be defined
  it('should be defined', () => {
    // Assert that tasksService and tasksController are defined
    expect(tasksService).toBeDefined();
    expect(tasksController).toBeDefined();
  });

  /**
   * Test suite: Tasks Controller
   *
   * Description:
   * This test suite contains unit tests for the methods of the TasksController class.
   * It verifies the behavior of the create(), findOne(), findAll(), update(), and delete()
   * methods when working with tasks.
   */
  describe('Task Controller', () => {
    /**
     * Test suite: Create Task
     *
     * Description:
     * This test suite contains unit tests for the create() method of the TasksController class.
     * It verifies the behavior of the create() method when creating a new task.
     */
    describe('create', () => {
      /**
       * Test case: should call create method of TasksService and return the created task
       *
       * Description:
       * This test case verifies that the create() method of the TasksController class
       * correctly calls the create() method of the TasksService class with the provided task data,
       * and returns the created task.
       */
      it('should call create method of TasksService and return the created task', async () => {
        // Arrange
        const createTaskDto: CreateTaskDto = { title: 'Sample Task' };
        const createdTask = {
          _id: '1',
          title: 'Sample Task',
          done: false,
        };

        jest
          .spyOn(tasksService, 'create')
          .mockResolvedValue(createdTask as any);

        // Act
        const result = await tasksController.create(createTaskDto);

        // Assert
        expect(tasksService.create).toHaveBeenCalledWith(createTaskDto);
        expect(result).toEqual(createdTask);
      });

      /**
       * Test case: should throw ConflictException if TaskService throws a duplicate key error
       *
       * Description:
       * This test case verifies that the create() method of the TasksController class
       * throws a ConflictException when the TaskService throws a duplicate key error.
       * It expects the error message to be "Task already exists".
       */
      it('should throw ConflictException if TaskService throws a duplicate key error', async () => {
        // Arrange
        const createTaskDto: CreateTaskDto = { title: 'Sample Task' };
        const duplicateKeyError = { code: 11000 };
        jest.spyOn(tasksService, 'create').mockRejectedValue(duplicateKeyError);

        // Act and Assert
        await expect(
          tasksController.create(createTaskDto),
        ).rejects.toThrowError(new ConflictException('Task already exists'));
      });

      /**
       * Test case: should throw original error if TaskService throws an error other than duplicate key error
       *
       * Description:
       * This test case verifies that the create() method of the TasksController class
       * throws the original error when the TaskService throws an error other than a duplicate key error.
       * It expects the error object to be the same as the original error object.
       */
      it('should throw original error if TaskService throws an error other than duplicate key error', async () => {
        // Arrange
        const createTaskDto: CreateTaskDto = { title: 'Sample Task' };
        const otherError = new Error('Some error');
        jest.spyOn(tasksService, 'create').mockRejectedValue(otherError);

        // Act and Assert
        await expect(
          tasksController.create(createTaskDto),
        ).rejects.toThrowError(otherError);
      });
    });

    /**
     * Test suite: findOne
     *
     * Description:
     * This test suite contains unit tests for the findOne() method of the TasksController class.
     * It verifies the behavior of the method when retrieving a single task by its ID.
     */
    describe('findOne', () => {
      /**
       * Test case: should return a task when a valid ID is provided
       *
       * Description:
       * This test case verifies that the findOne() method of the TasksController class
       * returns a task when a valid task ID is provided. It mocks the behavior of the
       * findOne() method of the TasksService class to return the expected task.
       */
      it('should return a task when a valid ID is provided', async () => {
        // Arrange
        const taskId = '1';
        const task = { _id: taskId, title: 'Task 1', done: false };
        jest.spyOn(tasksService, 'findOne').mockResolvedValue(task as any);

        // Act
        const result = await tasksController.findOne(taskId);

        // Assert
        expect(result).toEqual(task);
        expect(tasksService.findOne).toHaveBeenCalledWith(taskId);
      });

      /**
       * Test case: should throw NotFoundException when an invalid ID is provided
       *
       * Description:
       * This test case verifies that the findOne() method of the TasksController class
       * throws a NotFoundException when an invalid task ID is provided. It mocks the behavior
       * of the findOne() method of the TasksService class to return null, indicating that
       * no task was found with the provided ID.
       */
      it('should throw NotFoundException when an invalid ID is provided', async () => {
        // Arrange
        const invalidTaskId = '999';
        jest.spyOn(tasksService, 'findOne').mockResolvedValue(null);

        // Act and Assert
        await expect(tasksController.findOne(invalidTaskId)).rejects.toThrow(
          NotFoundException,
        );
        expect(tasksService.findOne).toHaveBeenCalledWith(invalidTaskId);
      });
    });

    /**
     * Test suite: findAll
     *
     * Description:
     * This test suite contains unit tests for the findAll() method of the TasksController class.
     * It verifies the behavior of the findAll() method when retrieving all tasks.
     */
    describe('findAll', () => {
      /**
       * Test case: should return an array of tasks
       *
       * Description:
       * This test case ensures that the findAll() method of the TasksController class
       * returns an array of tasks when called. It mocks the behavior of the findAll() method
       * of the TasksService class to return an empty array.
       */
      it('should return an array of tasks', async () => {
        // Arrange
        const tasks = [
          { _id: '1', title: 'Task 1', done: false },
          {
            _id: '2',
            title: 'Task 2',
            description: 'Some description 2',
            done: true,
          },
        ];
        jest.spyOn(tasksService, 'findAll').mockResolvedValue(tasks as any);

        // Act
        const result = await tasksController.findAll();

        // Assert
        expect(result).toEqual(tasks);
        expect(tasksService.findAll).toHaveBeenCalled();
      });
    });

    /**
     * Test suite: delete
     *
     * Description:
     * This test suite contains unit tests for the delete() method of the TasksController class.
     * It verifies the behavior of the delete() method when deleting a task by ID.
     */
    describe('delete', () => {
      /**
       * Test case: should delete a task and return it
       *
       * Description:
       * This test case verifies that the delete() method of the TasksController class
       * calls the delete() method of the TasksService class with the provided task ID,
       * and returns the deleted task. It mocks the behavior of the delete() method of the
       * TasksService class to return the deleted task.
       */
      it('should delete a task and return it', async () => {
        // Arrange
        const taskId = '1';
        const deletedTask = { _id: taskId, title: 'Sample Task', done: false };

        jest
          .spyOn(tasksService, 'delete')
          .mockResolvedValue(deletedTask as any);

        // Act
        const result = await tasksController.delete(taskId);

        // Assert
        expect(tasksService.delete).toHaveBeenCalledWith(taskId);
        expect(result).toBe(deletedTask);
      });

      /**
       * Test case: should throw NotFoundException for non-existing task
       *
       * Description:
       * This test case verifies that the delete() method of the TasksController class
       * calls the delete() method of the TasksService class with the provided task ID,
       * and throws a NotFoundException when the task does not exist. It mocks the behavior
       * of the delete() method of the TasksService class to return null.
       */
      it('should throw NotFoundException for non-existing task', async () => {
        // Arrange
        const taskId = 'non-existing-task-id';

        jest.spyOn(tasksService, 'delete').mockResolvedValue(null);

        try {
          // Act
          await tasksController.delete(taskId);
        } catch (error) {
          // Assert
          expect(tasksService.delete).toHaveBeenCalledWith(taskId);
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toBe('Task does not exist');
        }
      });
    });

    /**
     * Test suite: update
     *
     * Description:
     * This test suite contains unit tests for the update() method of the TasksController class.
     * It verifies the behavior of the update() method when updating a task with valid and invalid parameters.
     */
    describe('update', () => {
      /**
       * Test case: should update a task by ID
       *
       * Description:
       * This test case verifies that the update() method of the TasksController class
       * calls the update() method of the TasksService class with the provided task ID and update DTO,
       * and returns the updated task. It mocks the behavior of the update() method of the TasksService class
       * to return the updated task.
       */
      it('should update a task by ID', async () => {
        // Arrange
        const taskId = '1';
        const updateDto: UpdateTaskDto = { title: 'Updated Task', done: true };
        const updatedTask = { _id: taskId, title: 'Updated Task', done: true };

        jest
          .spyOn(tasksService, 'update')
          .mockResolvedValue(updatedTask as any);

        // Act
        const result = await tasksController.update(taskId, updateDto);

        // Assert
        expect(tasksService.update).toHaveBeenCalledWith(taskId, updateDto);
        expect(result).toEqual(updatedTask);
      });

      /**
       * Test case: should throw NotFoundException for non-existing ID
       *
       * Description:
       * This test case ensures that the update() method of the TasksController class
       * throws a NotFoundException when called with a non-existing task ID.
       * It mocks the behavior of the update() method of the TasksService class
       * to return null, indicating that the task does not exist.
       */
      it('should throw NotFoundException for non-existing ID', async () => {
        // Arrange
        const nonExistingId = 'non-existing-id';
        const updateDto: UpdateTaskDto = { title: 'Updated Task', done: true };

        jest.spyOn(tasksService, 'update').mockResolvedValue(null);

        // Act & Assert
        await expect(
          tasksController.update(nonExistingId, updateDto),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });
});
