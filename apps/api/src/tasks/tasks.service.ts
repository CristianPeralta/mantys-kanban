import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task } from '../schemas/task.schema';
import { Model } from 'mongoose';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>) {}

  /**
   * Retrieves all tasks.
   * @returns A list of tasks.
   */
  async findAll() {
    return this.taskModel.find();
  }

  /**
   * Creates a new task.
   * @param task The task data.
   * @returns The created task.
   */
  async create(task: CreateTaskDto) {
    const newTask = new this.taskModel(task);
    return newTask.save();
  }

  /**
   * Finds a task by its ID.
   * @param id The task ID.
   * @returns The found task, or `null` if not found.
   */
  async findOne(id: string) {
    return this.taskModel.findById(id);
  }

  /**
   * Deletes a task by its ID.
   * @param id The task ID.
   * @returns The deleted task, or `null` if not found.
   */
  async delete(id: string) {
    return this.taskModel.findByIdAndDelete(id);
  }

  /**
   * Updates a task by its ID.
   * @param id The task ID.
   * @param task The updated task data.
   * @returns The updated task, or `null` if not found.
   */
  async update(id: string, task: UpdateTaskDto) {
    return this.taskModel.findByIdAndUpdate(id, task, { new: true });
  }
}
