import { eq } from 'drizzle-orm';
import { db } from '../db';
import { projects, insertProjectSchema, InsertProject, Project } from '../db/schema';
import { z } from 'zod';

export class ProjectsRepository {
  async findAll(): Promise<Project[]> {
    return db.select().from(projects).orderBy(projects.createdAt);
  }

  async findById(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async create(data: z.infer<typeof insertProjectSchema>): Promise<Project> {
    const result = await db.insert(projects).values(data as InsertProject).returning();
    return result[0];
  }

  async update(id: string, data: Partial<z.infer<typeof insertProjectSchema>>): Promise<Project | undefined> {
    const result = await db.update(projects).set(data as Partial<InsertProject>).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }
}

export const projectsRepository = new ProjectsRepository();
