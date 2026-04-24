import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { timeEntries, tasks } from '../db/schema';
export class TimeEntriesRepository {
    async findAll(filters) {
        const conditions = [];
        if (filters?.taskId)
            conditions.push(eq(timeEntries.taskId, filters.taskId));
        if (filters?.startDate)
            conditions.push(gte(timeEntries.startTime, filters.startDate));
        if (filters?.endDate)
            conditions.push(lte(timeEntries.startTime, filters.endDate));
        if (conditions.length > 0) {
            return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.startTime));
        }
        return db.select().from(timeEntries).orderBy(desc(timeEntries.startTime));
    }
    async findById(id) {
        const result = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
        return result[0];
    }
    async findActiveEntry() {
        const result = await db.select().from(timeEntries)
            .where(sql `${timeEntries.endTime} IS NULL`)
            .orderBy(desc(timeEntries.startTime))
            .limit(1);
        return result[0];
    }
    async getWeeklySeconds() {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const result = await db.select({ total: sql `COALESCE(SUM(${timeEntries.durationSeconds}), 0)` })
            .from(timeEntries)
            .where(gte(timeEntries.startTime, weekStart));
        return Number(result[0]?.total ?? 0);
    }
    async getWeeklySecondsByProject() {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const result = await db.select({
            projectId: tasks.projectId,
            seconds: sql `COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
        })
            .from(timeEntries)
            .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
            .where(gte(timeEntries.startTime, weekStart))
            .groupBy(tasks.projectId);
        return result.map(r => ({ projectId: r.projectId ?? null, seconds: Number(r.seconds) }));
    }
    async create(data) {
        const result = await db.insert(timeEntries).values(data).returning();
        return result[0];
    }
    async update(id, data) {
        const result = await db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning();
        return result[0];
    }
    async stopEntry(id, endTime, durationSeconds) {
        const result = await db.update(timeEntries)
            .set({ endTime, durationSeconds })
            .where(eq(timeEntries.id, id))
            .returning();
        return result[0];
    }
    async delete(id) {
        const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
        return result.length > 0;
    }
}
export const timeEntriesRepository = new TimeEntriesRepository();
