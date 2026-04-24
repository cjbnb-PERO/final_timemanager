import { Router, Request, Response } from 'express';
import { timeEntriesRepository } from '../repositories/timeEntries';
import { tasksRepository } from '../repositories/tasks';
import { projectsRepository } from '../repositories/projects';
import { insertTimeEntrySchema } from '../db/schema';
import { ApiResponse, TimeEntry } from '../shared/types/api';

const router = Router();

function mapEntry(e: any, taskMap: Map<string, any>, projectMap: Map<string, any>): TimeEntry {
  const task = taskMap.get(e.taskId);
  const project = task?.projectId ? projectMap.get(task.projectId) : null;
  return {
    id: e.id,
    taskId: e.taskId,
    taskTitle: task?.title,
    projectId: task?.projectId ?? undefined,
    projectName: project?.name,
    projectColor: project?.color,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime ? e.endTime.toISOString() : undefined,
    durationSeconds: e.durationSeconds,
    notes: e.notes ?? undefined,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { taskId, startDate, endDate } = req.query;
    const filters: any = {};
    if (taskId) filters.taskId = taskId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    const [entries, allTasks, allProjects] = await Promise.all([
      timeEntriesRepository.findAll(filters),
      tasksRepository.findAll(),
      projectsRepository.findAll(),
    ]);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    const data = entries.map(e => mapEntry(e, taskMap, projectMap));
    res.json({ success: true, data } as ApiResponse<TimeEntry[]>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.get('/active', async (_req: Request, res: Response) => {
  try {
    const entry = await timeEntriesRepository.findActiveEntry();
    if (!entry) return res.json({ success: true, data: null });
    const [allTasks, allProjects] = await Promise.all([
      tasksRepository.findAll(),
      projectsRepository.findAll(),
    ]);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.json({ success: true, data: mapEntry(entry, taskMap, projectMap) } as ApiResponse<TimeEntry>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const insertData = {
      ...body,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    };
    const validated = insertTimeEntrySchema.parse(insertData);
    const entry = await timeEntriesRepository.create(validated);
    const [allTasks, allProjects] = await Promise.all([
      tasksRepository.findAll(),
      projectsRepository.findAll(),
    ]);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.status(201).json({ success: true, data: mapEntry(entry, taskMap, projectMap) } as ApiResponse<TimeEntry>);
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

router.put('/:id/stop', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const endTime = new Date();
    const existing = await timeEntriesRepository.findById(id);
    if (!existing) return res.status(404).json({ success: false, data: null, message: 'Entry not found' });
    const durationSeconds = Math.floor((endTime.getTime() - existing.startTime.getTime()) / 1000);
    const entry = await timeEntriesRepository.stopEntry(id, endTime, durationSeconds);
    if (entry) {
      await tasksRepository.updateTrackedSeconds(existing.taskId, durationSeconds);
    }
    const [allTasks, allProjects] = await Promise.all([
      tasksRepository.findAll(),
      projectsRepository.findAll(),
    ]);
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const projectMap = new Map(allProjects.map(p => [p.id, p]));
    res.json({ success: true, data: mapEntry(entry!, taskMap, projectMap) } as ApiResponse<TimeEntry>);
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await timeEntriesRepository.delete(id);
    if (!deleted) return res.status(404).json({ success: false, data: null, message: 'Entry not found' });
    res.json({ success: true, data: null, message: 'Entry deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
