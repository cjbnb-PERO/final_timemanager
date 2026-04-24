import { eq } from 'drizzle-orm';
import { db } from '../db';
import { projects } from '../db/schema';
export class ProjectsRepository {
    async findAll() {
        return db.select().from(projects).orderBy(projects.createdAt);
    }
    async findById(id) {
        const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
        return result[0];
    }
    async create(data) {
        const result = await db.insert(projects).values(data).returning();
        return result[0];
    }
    async update(id, data) {
        const result = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
        return result[0];
    }
    async delete(id) {
        const result = await db.delete(projects).where(eq(projects.id, id)).returning();
        return result.length > 0;
    }
}
export const projectsRepository = new ProjectsRepository();
