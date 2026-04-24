import { useState, useEffect } from 'react';
import { Plus, Play, Square, Trash2, ChevronDown, ChevronUp, Tag, Filter } from 'lucide-react';
import { apiTasks, apiProjects } from '../../lib/api';
import type { Task, Project } from '@shared/types/api';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = { high: '#F43F5E', medium: '#F59E0B', low: '#10B981' };
const PRIORITY_LABELS: Record<string, string> = { high: '高优先级', medium: '中优先级', low: '低优先级' };
const STATUS_LABELS: Record<string, string> = { inbox: '收件箱', todo: '待处理', in_progress: '进行中', done: '已完成' };

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  refreshKey: number;
  searchQuery: string;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  activeTimerId?: string;
  onRefresh: () => void;
}

export default function TaskListView({ refreshKey, searchQuery, onNewTask, onEditTask, onStartTimer, activeTimerId, onRefresh }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiTasks.getAll(), apiProjects.getAll()])
      .then(([tasksRes, projRes]) => {
        if (cancelled) return;
        if (tasksRes.success) setTasks(tasksRes.data);
        if (projRes.success) setProjects(projRes.data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleToggle = async (task: Task) => {
    const res = await apiTasks.update(task.id, { completed: !task.completed, status: !task.completed ? 'done' : 'in_progress' });
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      toast.success(res.data.completed ? '任务已完成' : '任务已重开');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiTasks.delete(id);
    if (res.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('任务已删除');
      onRefresh();
    }
  };

  const handleSubtaskToggle = async (task: Task, subtaskId: string) => {
    const updated = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    const res = await apiTasks.update(task.id, { subtasks: updated });
    if (res.success) setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 调试日志
  console.log('Search Query:', searchQuery);
  console.log('Filtered Tasks:', filtered.length);

  const grouped: Record<string, Task[]> = {};
  for (const t of filtered) {
    const key = t.status;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>任务列表</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>共 {tasks.length} 项任务</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ background: showFilters ? 'rgba(14,165,233,0.12)' : '#111827', border: '1px solid #1E293B', color: showFilters ? '#0EA5E9' : '#64748B' }}
          >
            <Filter size={14} />
            筛选
          </button>
          <button
            onClick={onNewTask}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
          >
            <Plus size={14} />
            新建任务
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#64748B' }}>状态</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg outline-none"
              style={{ background: '#1E293B', color: '#F1F5F9', border: '1px solid #1E293B' }}
            >
              <option value="all">全部</option>
              <option value="inbox">收件箱</option>
              <option value="todo">待处理</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#64748B' }}>项目</label>
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg outline-none"
              style={{ background: '#1E293B', color: '#F1F5F9', border: '1px solid #1E293B' }}
            >
              <option value="all">全部</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#64748B' }}>优先级</label>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg outline-none"
              style={{ background: '#1E293B', color: '#F1F5F9', border: '1px solid #1E293B' }}
            >
              <option value="all">全部</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>
        </div>
      )}

      {/* Task Groups */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#111827' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <p className="text-4xl mb-3">📥</p>
          <p className="font-medium" style={{ color: '#F1F5F9' }}>暂无任务</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>点击“新建任务”开始添加</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['inbox', 'todo', 'in_progress', 'done'] as const).map(status => {
            const group = grouped[status];
            if (!group || group.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{STATUS_LABELS[status]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1E293B', color: '#64748B' }}>{group.length}</span>
                </div>
                <div className="space-y-2">
                  {group.map(task => (
                    <div key={task.id}>
                      <div
                        className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: '#111827', border: '1px solid #1E293B' }}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggle(task)}
                            className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
                            style={{
                              border: `2px solid ${task.completed ? '#10B981' : '#1E293B'}`,
                              background: task.completed ? 'rgba(16,185,129,0.1)' : 'transparent',
                            }}
                          >
                            {task.completed && <span style={{ color: '#10B981', fontSize: 10 }}>✓</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium cursor-pointer ${task.completed ? 'line-through' : ''}`}
                                  style={{ color: task.completed ? '#64748B' : '#F1F5F9' }}
                                  onClick={() => onEditTask(task)}
                                >
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>
                                    {PRIORITY_LABELS[task.priority]}
                                  </span>
                                  {task.projectName && (
                                    <span className="text-xs px-2 py-0.5 rounded-full"
                                      style={{ background: `${task.projectColor ?? '#64748B'}18`, color: task.projectColor ?? '#64748B' }}>
                                      #{task.projectName}
                                    </span>
                                  )}
                                  {task.tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                                      style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                                      <Tag size={9} />{tag}
                                    </span>
                                  ))}
                                  {task.dueDate && (
                                    <span className="text-xs" style={{ color: new Date(task.dueDate) < new Date() && !task.completed ? '#F43F5E' : '#64748B' }}>
                                      截止 {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                                    </span>
                                  )}
                                  {task.totalTrackedSeconds > 0 && (
                                    <span className="text-xs font-mono" style={{ color: '#14B8A6' }}>
                                      {formatSeconds(task.totalTrackedSeconds)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {task.subtasks.length > 0 && (
                                  <button
                                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ background: '#1E293B', color: '#64748B' }}
                                  >
                                    {expandedTask === task.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                )}
                                <button
                                  onClick={() => onStartTimer(task)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                  style={{
                                    background: activeTimerId === task.id ? 'rgba(244,63,94,0.12)' : 'rgba(14,165,233,0.1)',
                                    color: activeTimerId === task.id ? '#F43F5E' : '#0EA5E9',
                                  }}
                                >
                                  {activeTimerId === task.id ? <Square size={11} /> : <Play size={11} />}
                                </button>
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                  style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E' }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subtasks */}
                      {expandedTask === task.id && task.subtasks.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1">
                          {task.subtasks.map(sub => (
                            <div key={sub.id}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                              style={{ background: '#0A0F1E', border: '1px solid #1E293B' }}
                            >
                              <button
                                onClick={() => handleSubtaskToggle(task, sub.id)}
                                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                                style={{
                                  border: `2px solid ${sub.completed ? '#10B981' : '#1E293B'}`,
                                  background: sub.completed ? 'rgba(16,185,129,0.1)' : 'transparent',
                                }}
                              >
                                {sub.completed && <span style={{ color: '#10B981', fontSize: 8 }}>✓</span>}
                              </button>
                              <span className={`text-xs ${sub.completed ? 'line-through' : ''}`}
                                style={{ color: sub.completed ? '#64748B' : '#F1F5F9' }}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
