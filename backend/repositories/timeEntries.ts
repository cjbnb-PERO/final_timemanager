import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { timeEntries, tasks, projects, insertTimeEntrySchema, InsertTimeEntry, TimeEntry } from '../db/schema';
import { z } from 'zod';

export class TimeEntriesRepository {
  async findAll(filters?: { taskId?: string; startDate?: Date; endDate?: Date }): Promise<TimeEntry[]> {
    const conditions = [];
    if (filters?.taskId) conditions.push(eq(timeEntries.taskId, filters.taskId));
    if (filters?.startDate) conditions.push(gte(timeEntries.startTime, filters.startDate));
    if (filters?.endDate) conditions.push(lte(timeEntries.startTime, filters.endDate));
    if (conditions.length > 0) {
      return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.startTime));
    }
    return db.select().from(timeEntries).orderBy(desc(timeEntries.startTime));
  }

  async findById(id: string): Promise<TimeEntry | undefined> {
    const result = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
    return result[0];
  }

  async findActiveEntry(): Promise<TimeEntry | undefined> {
    const result = await db.select().from(timeEntries)
      .where(sql`${timeEntries.endTime} IS NULL`)
      .orderBy(desc(timeEntries.startTime))
      .limit(1);
    return result[0];
  }

  async getWeeklySeconds(): Promise<number> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const result = await db.select({ total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)` })
      .from(timeEntries)
      .where(gte(timeEntries.startTime, weekStart));
    return Number(result[0]?.total ?? 0);
  }

  async getWeeklySecondsByProject(): Promise<{ projectId: string | null; seconds: number }[]> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const result = await db.select({
      projectId: tasks.projectId,
      seconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
      .from(timeEntries)
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(gte(timeEntries.startTime, weekStart))
      .groupBy(tasks.projectId);
    return result.map(r => ({ projectId: r.projectId ?? null, seconds: Number(r.seconds) }));
  }

  async create(data: z.infer<typeof insertTimeEntrySchema>): Promise<TimeEntry> {
    const result = await db.insert(timeEntries).values(data as InsertTimeEntry).returning();
    return result[0];
  }

  async update(id: string, data: Partial<z.infer<typeof insertTimeEntrySchema>>): Promise<TimeEntry | undefined> {
    const result = await db.update(timeEntries).set(data as Partial<InsertTimeEntry>).where(eq(timeEntries.id, id)).returning();
    return result[0];
  }

  async stopEntry(id: string, endTime: Date, durationSeconds: number): Promise<TimeEntry | undefined> {
    const result = await db.update(timeEntries)
      .set({ endTime, durationSeconds } as Partial<InsertTimeEntry>)
      .where(eq(timeEntries.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  }
}

export const timeEntriesRepository = new TimeEntriesRepository();
