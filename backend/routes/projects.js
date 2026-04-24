import { Router } from 'express';
import { projectsRepository } from '../repositories/projects';
import { insertProjectSchema, updateProjectSchema } from '../db/schema';
const router = Router();
router.get('/', async (_req, res) => {
    try {
        const data = await projectsRepository.findAll();
        const projects = data.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            description: p.description ?? undefined,
            createdAt: p.createdAt.toISOString(),
        }));
        res.json({ success: true, data: projects });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: 'Failed to fetch projects' });
    }
});
router.post('/', async (req, res) => {
    try {
        const validated = insertProjectSchema.parse(req.body);
        const project = await projectsRepository.create(validated);
        const result = {
            id: project.id,
            name: project.name,
            color: project.color,
            description: project.description ?? undefined,
            createdAt: project.createdAt.toISOString(),
        };
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, data: null, message: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const validated = updateProjectSchema.parse(req.body);
        const project = await projectsRepository.update(id, validated);
        if (!project)
            return res.status(404).json({ success: false, data: null, message: 'Project not found' });
        const result = {
            id: project.id,
            name: project.name,
            color: project.color,
            description: project.description ?? undefined,
            createdAt: project.createdAt.toISOString(),
        };
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, data: null, message: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await projectsRepository.delete(id);
        if (!deleted)
            return res.status(404).json({ success: false, data: null, message: 'Project not found' });
        res.json({ success: true, data: null, message: 'Project deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
export default router;
