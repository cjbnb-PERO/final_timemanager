import { eq, and, lte, gte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { tasks, projects, insertTaskSchema, InsertTask, Task } from '../db/schema';
import { z } from 'zod';

export class TasksRepository {
  async findAll(filters?: { status?: string; projectId?: string; completed?: boolean }): Promise<Task[]> {
    const query = db.select().from(tasks);
    const conditions = [];
    if (filters?.status) conditions.push(eq(tasks.status, filters.status));
    if (filters?.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
    if (filters?.completed !== undefined) conditions.push(eq(tasks.completed, filters.completed));
    if (conditions.length > 0) {
      return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async findById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async findTodayTasks(): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return db.select().from(tasks)
      .where(and(gte(tasks.dueDate, today), lte(tasks.dueDate, tomorrow)))
      .orderBy(desc(tasks.createdAt));
  }

  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    return db.select().from(tasks)
      .where(and(lte(tasks.dueDate, now), eq(tasks.completed, false)))
      .orderBy(desc(tasks.createdAt));
  }

  async create(data: z.infer<typeof insertTaskSchema>): Promise<Task> {
    const result = await db.insert(tasks).values(data as InsertTask).returning();
    return result[0];
  }

  async update(id: string, data: Partial<z.infer<typeof insertTaskSchema>>): Promise<Task | undefined> {
    const updateData = { ...data, updatedAt: new Date() } as Partial<InsertTask>;
    const result = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async updateTrackedSeconds(id: string, additionalSeconds: number): Promise<void> {
    await db.update(tasks)
      .set({ totalTrackedSeconds: sql`${tasks.totalTrackedSeconds} + ${additionalSeconds}`, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }
}

export const tasksRepository = new TasksRepository();
