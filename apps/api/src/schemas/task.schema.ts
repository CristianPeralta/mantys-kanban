import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
/**
 * Represents a task.
 */
@Schema({
  timestamps: true,
})
export class Task {
  @ApiProperty({
    example: 'Task Title',
    description: 'The title of the task',
  })
  @Prop({
    unique: true,
    required: true,
    trim: true,
  })
  title: string;

  @ApiProperty({
    example: 'Task Description',
    description: 'The description of the task',
  })
  @Prop({
    trim: true,
  })
  description: string;

  @ApiProperty({
    example: false,
    description: 'Indicates if the task is done',
    default: false,
  })
  @Prop({
    default: false,
  })
  done: boolean;
}

/**
 * The Mongoose schema for the `Task` model.
 */
export const TaskSchema = SchemaFactory.createForClass(Task);
