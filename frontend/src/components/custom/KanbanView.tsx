import { useState, useEffect } from 'react';
import { Play, Square, Plus } from 'lucide-react';
import { apiTasks } from '../../lib/api';
import type { Task, TaskStatus } from '@shared/types/api';
import { toast } from 'sonner';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'inbox', label: '收件箱', color: '#64748B' },
  { id: 'todo', label: '待处理', color: '#F59E0B' },
  { id: 'in_progress', label: '进行中', color: '#0EA5E9' },
  { id: 'done', label: '已完成', color: '#10B981' },
];

const PRIORITY_COLORS: Record<string, string> = { high: '#F43F5E', medium: '#F59E0B', low: '#10B981' };
const PRIORITY_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' };

interface Props {
  refreshKey: number;
  onEditTask: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  activeTimerId?: string;
  onRefresh: () => void;
}

export default function KanbanView({ refreshKey, onEditTask, onStartTimer, activeTimerId, onRefresh }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [activeCol, setActiveCol] = useState<TaskStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiTasks.getAll().then(res => {
      if (!cancelled && res.success) setTasks(res.data);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleDragStart = (taskId: string) => setDragging(taskId);
  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(status);
  };
  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!dragging) return;
    const task = tasks.find(t => t.id === dragging);
    if (!task || task.status === status) { setDragging(null); setDragOver(null); return; }
    const completed = status === 'done';
    const res = await apiTasks.update(dragging, { status, completed });
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === dragging ? res.data : t));
      toast.success(`任务已移至「${COLUMNS.find(c => c.id === status)?.label}」`);
      onRefresh();
    }
    setDragging(null);
    setDragOver(null);
  };

  // Mobile: show one column at a time
  const displayCols = activeCol ? COLUMNS.filter(c => c.id === activeCol) : COLUMNS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>看板视图</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>拖拽任务卡片切换状态</p>
        </div>
      </div>

      {/* Mobile column tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
        <button
          onClick={() => setActiveCol(null)}
          className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0"
          style={{
            background: activeCol === null ? 'rgba(14,165,233,0.12)' : 'transparent',
            color: activeCol === null ? '#0EA5E9' : '#64748B',
            border: activeCol === null ? 'none' : '1px solid #1E293B',
          }}
        >
          全部
        </button>
        {COLUMNS.map(col => (
          <button
            key={col.id}
            onClick={() => setActiveCol(activeCol === col.id ? null : col.id)}
            className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: activeCol === col.id ? `${col.color}18` : 'transparent',
              color: activeCol === col.id ? col.color : '#64748B',
              border: activeCol === col.id ? 'none' : '1px solid #1E293B',
            }}
          >
            {col.label} ({tasks.filter(t => t.status === col.id).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: '#111827' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            const isHidden = activeCol !== null && activeCol !== col.id;
            return (
              <div
                key={col.id}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                onDragLeave={() => setDragOver(null)}
                className={`rounded-2xl p-3 min-h-[400px] transition-all ${isHidden ? 'hidden lg:block' : ''}`}
                style={{
                  background: dragOver === col.id ? `${col.color}08` : '#0A0F1E',
                  border: `1px solid ${dragOver === col.id ? col.color + '40' : '#1E293B'}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${col.color}18`, color: col.color }}>{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onClick={() => onEditTask(task)}
                      className="rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
                      style={{
                        background: '#111827',
                        border: `1px solid ${task.status === 'in_progress' ? col.color + '30' : '#1E293B'}`,
                        opacity: dragging === task.id ? 0.5 : 1,
                      }}
                    >
                      <p className="text-xs font-medium leading-snug mb-2" style={{ color: '#F1F5F9' }}>{task.title}</p>
                      {task.description && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: '#64748B' }}>{task.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.projectName && (
                            <span className="text-xs" style={{ color: task.projectColor ?? '#64748B' }}>#{task.projectName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {task.dueDate && (
                            <span className="text-xs" style={{ color: new Date(task.dueDate) < new Date() && !task.completed ? '#F43F5E' : '#64748B' }}>
                              {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                            </span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); onStartTimer(task); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                              background: activeTimerId === task.id ? 'rgba(244,63,94,0.12)' : 'rgba(14,165,233,0.1)',
                              color: activeTimerId === task.id ? '#F43F5E' : '#0EA5E9',
                            }}
                          >
                            {activeTimerId === task.id ? <Square size={10} /> : <Play size={10} />}
                          </button>
                        </div>
                      </div>
                      {task.subtasks.length > 0 && (
                        <div className="mt-2">
                          <div className="w-full rounded-full h-1" style={{ background: '#1E293B' }}>
                            <div className="h-1 rounded-full" style={{
                              width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`,
                              background: col.color,
                            }} />
                          </div>
                          <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} 子任务
                          </p>
                        </div>
                      )}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs" style={{ color: '#1E293B' }}>拖拽任务到此处</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
