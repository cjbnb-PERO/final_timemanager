import { Router } from 'express';
import { timeEntriesRepository } from '../repositories/timeEntries';
import { tasksRepository } from '../repositories/tasks';
import { projectsRepository } from '../repositories/projects';
const router = Router();
router.get('/dashboard', async (_req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [todayTasks, overdueTasks, weekSeconds, activeEntry] = await Promise.all([
            tasksRepository.findTodayTasks(),
            tasksRepository.findOverdue(),
            timeEntriesRepository.getWeeklySeconds(),
            timeEntriesRepository.findActiveEntry(),
        ]);
        const todayCompleted = todayTasks.filter(t => t.completed).length;
        const allTasks = await tasksRepository.findAll();
        const completedCount = allTasks.filter(t => t.completed).length;
        const completionRate = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
        let activeTimerSeconds = 0;
        if (activeEntry) {
            activeTimerSeconds = Math.floor((Date.now() - activeEntry.startTime.getTime()) / 1000);
        }
        const stats = {
            todayTasksTotal: todayTasks.length,
            todayTasksCompleted: todayCompleted,
            weekTrackedSeconds: weekSeconds,
            completionRate,
            overdueCount: overdueTasks.length,
            activeTimerTaskId: activeEntry?.taskId,
            activeTimerSeconds,
        };
        res.json({ success: true, data: stats });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
router.get('/weekly', async (_req, res) => {
    try {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const [allProjects, weeklyByProject, allTasks, overdueTasks] = await Promise.all([
            projectsRepository.findAll(),
            timeEntriesRepository.getWeeklySecondsByProject(),
            tasksRepository.findAll(),
            tasksRepository.findOverdue(),
        ]);
        const projectMap = new Map(allProjects.map(p => [p.id, p]));
        const timeByProject = weeklyByProject
            .filter(r => r.seconds > 0)
            .map(r => ({
            projectName: r.projectId ? (projectMap.get(r.projectId)?.name ?? '无项目') : '无项目',
            projectColor: r.projectId ? (projectMap.get(r.projectId)?.color ?? '#64748B') : '#64748B',
            seconds: r.seconds,
        }));
        const totalSeconds = timeByProject.reduce((s, r) => s + r.seconds, 0);
        const completedCount = allTasks.filter(t => t.completed).length;
        const completionRate = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
        // Build time by day for last 7 days
        const entries = await timeEntriesRepository.findAll({ startDate: weekStart });
        const dayMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            dayMap[d.toISOString().split('T')[0]] = 0;
        }
        for (const e of entries) {
            const day = e.startTime.toISOString().split('T')[0];
            if (dayMap[day] !== undefined)
                dayMap[day] += e.durationSeconds;
        }
        const timeByDay = Object.entries(dayMap).map(([date, seconds]) => ({ date, seconds }));
        // AI insight
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevEntries = await timeEntriesRepository.findAll({ startDate: prevWeekStart, endDate: weekStart });
        const prevTotal = prevEntries.reduce((s, e) => s + e.durationSeconds, 0);
        let aiInsight = '';
        if (prevTotal > 0 && totalSeconds > 0) {
            const pct = Math.round(((totalSeconds - prevTotal) / prevTotal) * 100);
            if (pct > 10)
                aiInsight = `本周追踪时间比上周增加了 ${pct}%，工作强度有所提升，请注意劳逸平衡。`;
            else if (pct < -10)
                aiInsight = `本周追踪时间比上周减少了 ${Math.abs(pct)}%，建议检查是否有未记录的工作时间。`;
            else
                aiInsight = `本周工作节奏与上周基本持平，保持良好状态！`;
        }
        else {
            aiInsight = `开始记录您的时间，获得更深入的工作洞察。`;
        }
        const insight = {
            totalTrackedSeconds: totalSeconds,
            totalTasksCompleted: completedCount,
            totalTasksOverdue: overdueTasks.length,
            completionRate,
            timeByProject,
            timeByDay,
            aiInsight,
        };
        res.json({ success: true, data: insight });
    }
    catch (err) {
        res.status(500).json({ success: false, data: null, message: err.message });
    }
});
export default router;
