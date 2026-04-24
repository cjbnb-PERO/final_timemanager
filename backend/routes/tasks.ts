import { Router, Request, Response } from 'express';
import { tasksRepository } from '../repositories/tasks';
import { projectsRepository } from '../repositories/projects';
import { insertTaskSchema, updateTaskSchema } from '../db/schema';
import { ApiResponse, Task } from '../shared/types/api';

const router = Router();

function mapTask(t: any, projectMap: Map<string, any>): Task {
  const project = t.projectId ? projectMap.get(t.projectId) : null;
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    priority: t.priority as Task['priority'],
    status: t.status as Task['status'],
    projectId: t.projectId ?? undefined,
    projectName: project?.name,
    projectColor: project?.color,
    tags: (() => { try { return JSON.parse(t.tags || '[]'); } catch { return []; } })(),
    dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
    reminderTime: t.reminderTime ? t.reminderTime.toISOString() : undefined,
    reminderMinutesBefore: t.reminderMinutesBefore ?? 15,
    repeatInterval: t.repeatInterval as Task['repeatInterval'],
    subtasks: (() => { try { return JSON.parse(t.subtasks || '[]'); } catch { return []; } })(),
    totalTrackedSeconds: t.totalTrackedSeconds ?? 0,
    completed: t.completed,
    completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, projectId, completed } = req.query;
    const filters: any = {};
    if (status) filters.status = status as string;
    if (projectId) filters.projectId = projectId as string;
    if (completed !== undefined) filters.completed = completed === 'true';
    const [data, allProjects] = await Promise.all([
      tasksRepository.findAll(filters),
      projectsRepository.findAll(),
    ]);
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    const tasks = data.map(t => mapTask(t, projectMap));
    res.json({ success: true, data: tasks } as ApiResponse<Task[]>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/today', async (_req: Request, res: Response) => {
  try {
    const [data, allProjects] = await Promise.all([
      tasksRepository.findTodayTasks(),
      projectsRepository.findAll(),
    ]);
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    const tasks = data.map(t => mapTask(t, projectMap));
    res.json({ success: true, data: tasks } as ApiResponse<Task[]>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/overdue', async (_req: Request, res: Response) => {
  try {
    const [data, allProjects] = await Promise.all([
      tasksRepository.findOverdue(),
      projectsRepository.findAll(),
    ]);
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    const tasks = data.map(t => mapTask(t, projectMap));
    res.json({ success: true, data: tasks } as ApiResponse<Task[]>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const [t, allProjects] = await Promise.all([
      tasksRepository.findById(id),
      projectsRepository.findAll(),
    ]);
    if (!t) return res.status(404).json({ success: false, data: null, message: 'Task not found' });
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.json({ success: true, data: mapTask(t, projectMap) } as ApiResponse<Task>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const insertData = {
      ...body,
      tags: JSON.stringify(body.tags || []),
      subtasks: JSON.stringify(body.subtasks || []),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      reminderTime: body.reminderTime ? new Date(body.reminderTime) : undefined,
    };
    const validated = insertTaskSchema.parse(insertData);
    const t = await tasksRepository.create(validated);
    const allProjects = await projectsRepository.findAll();
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.status(201).json({ success: true, data: mapTask(t, projectMap) } as ApiResponse<Task>);
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body = req.body;
    const updateData: any = { ...body };
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.subtasks !== undefined) updateData.subtasks = JSON.stringify(body.subtasks);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.reminderTime !== undefined) updateData.reminderTime = body.reminderTime ? new Date(body.reminderTime) : null;
    if (body.completed === true && !body.completedAt) updateData.completedAt = new Date();
    const validated = updateTaskSchema.parse(updateData);
    const t = await tasksRepository.update(id, validated);
    if (!t) return res.status(404).json({ success: false, data: null, message: 'Task not found' });
    const allProjects = await projectsRepository.findAll();
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.json({ success: true, data: mapTask(t, projectMap) } as ApiResponse<Task>);
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await tasksRepository.delete(id);
    if (!deleted) return res.status(404).json({ success: false, data: null, message: 'Task not found' });
    res.json({ success: true, data: null, message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
