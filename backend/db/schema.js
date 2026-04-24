import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
// ─── Projects ────────────────────────────────────────────────────────────────
export const projects = pgTable('Projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#0EA5E9'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const insertProjectSchema = createInsertSchema(projects, {
    name: z.string().min(1, 'Project name is required'),
    color: z.string().min(1),
});
export const updateProjectSchema = insertProjectSchema.partial();
// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasks = pgTable('Tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('inbox'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    tags: text('tags').notNull().default('[]'),
    dueDate: timestamp('due_date'),
    reminderTime: timestamp('reminder_time'),
    reminderMinutesBefore: integer('reminder_minutes_before').default(15),
    repeatInterval: text('repeat_interval').notNull().default('none'),
    subtasks: text('subtasks').notNull().default('[]'),
    totalTrackedSeconds: integer('total_tracked_seconds').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export const insertTaskSchema = createInsertSchema(tasks, {
    title: z.string().min(1, 'Task title is required'),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    status: z.enum(['inbox', 'todo', 'in_progress', 'done']).default('inbox'),
    repeatInterval: z.enum(['daily', 'weekly', 'monthly', 'none']).default('none'),
    tags: z.string().default('[]'),
    subtasks: z.string().default('[]'),
});
export const updateTaskSchema = insertTaskSchema.partial();
// ─── Time Entries ─────────────────────────────────────────────────────────────
export const timeEntries = pgTable('TimeEntries', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const insertTimeEntrySchema = createInsertSchema(timeEntries, {
    durationSeconds: z.coerce.number().int().min(0).default(0),
});
export const updateTimeEntrySchema = insertTimeEntrySchema.partial();
