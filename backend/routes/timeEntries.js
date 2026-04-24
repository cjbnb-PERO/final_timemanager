import { Router } from 'express';
import { timeEntriesRepository } from '../repositories/timeEntries';
import { tasksRepository } from '../repositories/tasks';
import { projectsRepository } from '../repositories/projects';
import { insertTimeEntrySchema } from '../db/schema';
const router = Router();
function mapEntry(e, taskMap, projectMap) {
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
router.get('/', async (req, res) => {
    try {
        const { taskId, startDate, endDate } = req.query;
        const filters = {};
        if (taskId)
            filters.taskId = taskId;
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        const [entries, allTasks, allProjects] = await Promise.all([
            timeEntriesRepository.findAll(filters),
            tasksRepository.findAll(),
            projectsRepository.findAll(),
        ]);
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const projectMap = new Map(allProjects.map(p => [p.id, p]));
        const data = entries.map(e => mapEntry(e, taskMap, projectMap));
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
router.get('/active', async (_req, res) => {
    try {
        const entry = await timeEntriesRepository.findActiveEntry();
        if (!entry)
            return res.json({ success: true, data: null });
        const [allTasks, allProjects] = await Promise.all([
            tasksRepository.findAll(),
            projectsRepository.findAll(),
        ]);
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const projectMap = new Map(allProjects.map(p => [p.id, p]));
        res.json({ success: true, data: mapEntry(entry, taskMap, projectMap) });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
router.post('/', async (req, res) => {
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
        res.status(201).json({ success: true, data: mapEntry(entry, taskMap, projectMap) });
    }
    catch (err) {
        res.status(400).json({ success: false, data: null, message: err.message });
    }
});
router.put('/:id/stop', async (req, res) => {
    try {
        const id = req.params.id;
        const endTime = new Date();
        const existing = await timeEntriesRepository.findById(id);
        if (!existing)
            return res.status(404).json({ success: false, data: null, message: 'Entry not found' });
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
        res.json({ success: true, data: mapEntry(entry, taskMap, projectMap) });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await timeEntriesRepository.delete(id);
        if (!deleted)
            return res.status(404).json({ success: false, data: null, message: 'Entry not found' });
        res.json({ success: true, data: null, message: 'Entry deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
export default router;
