import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Play, Square, Zap, ChevronRight } from 'lucide-react';
import { apiInsights, apiTasks } from '../../lib/api';
import type { DashboardStats, Task, TimeEntry } from '@shared/types/api';

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimer(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#F43F5E',
  medium: '#F59E0B',
  low: '#10B981',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

interface Props {
  refreshKey: number;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: () => void;
  activeTimer: TimeEntry | null;
  timerSeconds: number;
  onNavigate: (view: string) => void;
}

export default function DashboardView({ refreshKey, onNewTask, onEditTask, onStartTimer, onStopTimer, activeTimer, timerSeconds, onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'in_progress' | 'done'>('all');
  const [quickTitle, setQuickTitle] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiInsights.getDashboard(),
      apiTasks.getToday(),
      apiTasks.getAll(),
    ]).then(([statsRes, todayRes, allRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (todayRes.success) setTodayTasks(todayRes.data);
      if (allRes.success) setAllTasks(allRes.data);
    }).finally(() => setLoading(false));
  }, [refreshKey]);

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !quickTitle.trim()) return;
    const { apiTasks: api } = await import('../../lib/api');
    await api.create({ title: quickTitle.trim() });
    setQuickTitle('');
    const [todayRes, allRes, statsRes] = await Promise.all([
      apiTasks.getToday(),
      apiTasks.getAll(),
      apiInsights.getDashboard(),
    ]);
    if (todayRes.success) setTodayTasks(todayRes.data);
    if (allRes.success) setAllTasks(allRes.data);
    if (statsRes.success) setStats(statsRes.data);
  };

  const handleToggleComplete = async (task: Task) => {
    await apiTasks.update(task.id, { completed: !task.completed, status: !task.completed ? 'done' : 'in_progress' });
    const [todayRes, allRes, statsRes] = await Promise.all([
      apiTasks.getToday(),
      apiTasks.getAll(),
      apiInsights.getDashboard(),
    ]);
    if (todayRes.success) setTodayTasks(todayRes.data);
    if (allRes.success) setAllTasks(allRes.data);
    if (statsRes.success) setStats(statsRes.data);
  };

  const filteredTasks = todayTasks.filter(t => {
    if (taskFilter === 'in_progress') return !t.completed;
    if (taskFilter === 'done') return t.completed;
    return true;
  });

  const now = new Date();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const today = now.getDay();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - ((today === 0 ? 7 : today) - 1) + i);
    return d;
  });

  const overdueCount = allTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;
  const completionRate = stats?.completionRate ?? 0;
  const weekSeconds = stats?.weekTrackedSeconds ?? 0;

  // Weekly time distribution from allTasks
  const projectTimeMap: Record<string, { name: string; color: string; seconds: number }> = {};
  for (const t of allTasks) {
    const key = t.projectId ?? 'none';
    if (!projectTimeMap[key]) {
      projectTimeMap[key] = { name: t.projectName ?? '无项目', color: t.projectColor ?? '#64748B', seconds: 0 };
    }
    projectTimeMap[key].seconds += t.totalTrackedSeconds;
  }
  const projectTimes = Object.values(projectTimeMap).filter(p => p.seconds > 0).sort((a, b) => b.seconds - a.seconds).slice(0, 4);
  const maxProjectSeconds = Math.max(...projectTimes.map(p => p.seconds), 1);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748B' }}>
            {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: '#F1F5F9' }}>
            早上好，张明 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
            今天有{' '}
            <span className="font-semibold" style={{ color: '#0EA5E9' }}>{stats?.todayTasksTotal ?? 0} 项任务</span>
            待完成，其中{' '}
            <span className="font-semibold" style={{ color: '#F43F5E' }}>{overdueCount} 项</span>已递期。
          </p>
        </div>
        {activeTimer && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
            <span className="font-mono text-sm font-semibold" style={{ color: '#14B8A6' }}>{formatTimer(timerSeconds)}</span>
            <span className="text-xs" style={{ color: '#64748B' }}>计时中</span>
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '2px solid #1E293B' }}>
          <span style={{ color: '#64748B', fontSize: 12 }}>+</span>
        </div>
        <input
          type="text"
          placeholder="快速添加任务… 按 Enter 确认"
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          onKeyDown={handleQuickAdd}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: '#F1F5F9' }}
        />
        <button
          onClick={onNewTask}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}
        >
          详细添加
        </button>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <CheckCircle2 size={20} />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', hoverBorder: 'rgba(14,165,233,0.4)', value: stats?.todayTasksTotal ?? 0, label: '今日任务', badge: '+12%', badgeColor: '#10B981' },
          { icon: <Clock size={20} />, color: '#14B8A6', bg: 'rgba(20,184,166,0.1)', hoverBorder: 'rgba(20,184,166,0.4)', value: formatSeconds(weekSeconds), label: '已追踪时间', badge: '本周', badgeColor: '#14B8A6' },
          { icon: <TrendingUp size={20} />, color: '#10B981', bg: 'rgba(16,185,129,0.1)', hoverBorder: 'rgba(16,185,129,0.4)', value: `${completionRate}%`, label: '任务完成率', badge: '↡20%', badgeColor: '#10B981' },
          { icon: <AlertTriangle size={20} />, color: '#F43F5E', bg: 'rgba(244,63,94,0.1)', hoverBorder: 'rgba(244,63,94,0.4)', value: overdueCount, label: '递期任务', badge: '需处理', badgeColor: '#F43F5E' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-5 transition-all duration-300 group cursor-pointer hover:border-opacity-100"
            style={{ background: '#111827', border: '1px solid #1E293B' }}
            onClick={() => {
              if (stat.label === '今日任务') {
                onNavigate('tasks');
              } else if (stat.label === '已追踪时间') {
                onNavigate('time');
              } else if (stat.label === '任务完成率') {
                onNavigate('insights');
              } else if (stat.label === '递期任务') {
                onNavigate('tasks');
              }
            }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: stat.bg, color: stat.color }}>
                {stat.icon}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${stat.badgeColor}18`, color: stat.badgeColor }}>
                {stat.badge}
              </span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#F1F5F9' }}>{loading ? '—' : stat.value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>今日任务</h2>
            <div className="flex items-center gap-2">
              {(['all', 'in_progress', 'done'] as const).map(f => (
                <button key={f}
                  onClick={() => setTaskFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: taskFilter === f ? 'rgba(14,165,233,0.12)' : 'transparent',
                    color: taskFilter === f ? '#0EA5E9' : '#64748B',
                    border: taskFilter === f ? 'none' : '1px solid #1E293B',
                  }}
                >
                  {f === 'all' ? '全部' : f === 'in_progress' ? '进行中' : '已完成'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#111827' }} />
              ))
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
                <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#1E293B' }} />
                <p className="text-sm" style={{ color: '#64748B' }}>今日暂无任务</p>
              </div>
            ) : filteredTasks.map(task => (
              <div key={task.id}
                className="rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: '#111827', border: `1px solid ${task.completed ? '#1E293B' : overdueCount > 0 && task.dueDate && new Date(task.dueDate) < now ? 'rgba(244,63,94,0.2)' : '#1E293B'}` }}
                onClick={() => onEditTask(task)}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleComplete(task); }}
                    className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{
                      border: `2px solid ${task.completed ? '#10B981' : '#1E293B'}`,
                      background: task.completed ? 'rgba(16,185,129,0.1)' : 'transparent',
                    }}
                  >
                    {task.completed && <CheckCircle2 size={10} style={{ color: '#10B981' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}
                          style={{ color: task.completed ? '#64748B' : '#F1F5F9' }}>
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
                          {task.dueDate && (
                            <span className="text-xs" style={{ color: '#64748B' }}>
                              截止 {new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {task.subtasks.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs" style={{ color: '#64748B' }}>子任务 {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                            </div>
                            <div className="w-full rounded-full h-1.5" style={{ background: '#1E293B' }}>
                              <div className="h-1.5 rounded-full" style={{
                                width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`,
                                background: 'linear-gradient(90deg, #0EA5E9, #14B8A6)',
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.totalTrackedSeconds > 0 && (
                          <span className="text-xs font-mono" style={{ color: '#14B8A6' }}>
                            {formatSeconds(task.totalTrackedSeconds)}
                          </span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); onStartTimer(task); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: activeTimer?.taskId === task.id ? 'rgba(244,63,94,0.12)' : 'rgba(14,165,233,0.1)',
                            color: activeTimer?.taskId === task.id ? '#F43F5E' : '#0EA5E9',
                          }}
                        >
                          {activeTimer?.taskId === task.id ? <Square size={12} /> : <Play size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('tasks')}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{ border: '1px solid #1E293B', color: '#64748B' }}
          >
            查看所有任务 <ChevronRight size={14} />
          </button>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Active Timer */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #111827, #0A0F1E)', border: '1px solid #1E293B' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.05), transparent)' }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>当前计时</h3>
                {activeTimer ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                    <span className="text-xs font-medium" style={{ color: '#10B981' }}>运行中</span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: '#64748B' }}>未开始</span>
                )}
              </div>
              {activeTimer ? (
                <>
                  <div className="text-center py-4">
                    <p className="font-mono text-5xl font-bold" style={{ color: '#14B8A6' }}>{formatTimer(timerSeconds)}</p>
                    <p className="text-xs mt-2 truncate" style={{ color: '#64748B' }}>{activeTimer.taskTitle}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={onStopTimer}
                      className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors"
                      style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E' }}
                    >
                      停止
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="font-mono text-4xl font-bold" style={{ color: '#1E293B' }}>00:00:00</p>
                  <p className="text-xs mt-2" style={{ color: '#64748B' }}>选择任务开始计时</p>
                  <button
                    onClick={() => onNavigate('time')}
                    className="mt-3 text-xs px-4 py-2 rounded-xl transition-colors"
                    style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}
                  >
                    前往时间追踪
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Time Distribution */}
          <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#F1F5F9' }}>本周时间分布</h3>
            {projectTimes.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>暂无时间记录</p>
            ) : (
              <div className="space-y-3">
                {projectTimes.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-xs" style={{ color: '#64748B' }}>{p.name}</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: '#F1F5F9' }}>{formatSeconds(p.seconds)}</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: '#1E293B' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${(p.seconds / maxProjectSeconds) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Insight */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.2)' }}>
                <Zap size={14} style={{ color: '#6366F1' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#6366F1' }}>智能洞察</p>
                <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  本周会议时间比上周增加了{' '}
                  <span className="font-semibold" style={{ color: '#F59E0B' }}>20%</span>
                  ，建议精简非核心会议，预计可释放{' '}
                  <span className="font-semibold" style={{ color: '#10B981' }}>2h</span>{' '}
                  深度工作时间。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>本周日历</h2>
          <button onClick={() => onNavigate('calendar')} className="text-xs transition-colors" style={{ color: '#0EA5E9' }}>查看完整日历 →</button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const date = weekDates[i];
            const isToday = date.toDateString() === now.toDateString();
            return (
              <div key={i} className="text-center">
                <p className="text-xs mb-2" style={{ color: '#64748B' }}>{day}</p>
                <div
                  className="w-full aspect-square rounded-xl flex items-center justify-center text-sm cursor-pointer transition-colors"
                  style={{
                    background: isToday ? 'linear-gradient(135deg, #0EA5E9, #14B8A6)' : '#1E293B',
                    color: isToday ? 'white' : '#64748B',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Preview */}
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>看板概览</h2>
          <button onClick={() => onNavigate('kanban')} className="text-xs" style={{ color: '#0EA5E9' }}>完整看板 →</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '待处理', color: '#64748B', status: 'todo' },
            { label: '进行中', color: '#0EA5E9', status: 'in_progress' },
            { label: '已完成', color: '#10B981', status: 'done' },
          ].map(col => {
            const colTasks = allTasks.filter(t => t.status === col.status).slice(0, 2);
            const count = allTasks.filter(t => t.status === col.status).length;
            return (
              <div key={col.status} className="rounded-xl p-3" style={{ background: '#0A0F1E' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${col.color}18`, color: col.color }}>{count}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(t => (
                    <div key={t.id} className="rounded-lg p-2.5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
                      <p className="text-xs leading-snug" style={{ color: '#F1F5F9' }}>{t.title}</p>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-center py-2" style={{ color: '#1E293B' }}>暂无</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurring Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#F1F5F9' }}>重复任务</h2>
          <div className="space-y-3">
            {allTasks.filter(t => t.repeatInterval !== 'none').slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-[#1E293B]"
                onClick={() => onEditTask(t)}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(20,184,166,0.1)' }}>
                  <Clock size={14} style={{ color: '#14B8A6' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{t.title}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    {t.repeatInterval === 'daily' ? '每天' : t.repeatInterval === 'weekly' ? '每周' : '每月'}重复
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(20,184,166,0.1)', color: '#14B8A6' }}>
                  {t.repeatInterval === 'daily' ? '每天' : t.repeatInterval === 'weekly' ? '每周' : '每月'}
                </span>
              </div>
            ))}
            {allTasks.filter(t => t.repeatInterval !== 'none').length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#64748B' }}>暂无重复任务</p>
            )}
          </div>
        </div>

        {/* Reminders */}
        <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>即将提醒</h2>
          </div>
          <div className="space-y-3">
            {allTasks.filter(t => t.reminderTime && !t.completed).slice(0, 2).map(t => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <span style={{ color: '#F59E0B', fontSize: 14 }}>🔔</span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{t.title}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    {t.reminderTime ? new Date(t.reminderTime).toLocaleString('zh-CN') : ''} · 提前 {t.reminderMinutesBefore} 分钟提醒
                  </p>
                </div>
              </div>
            ))}
            {allTasks.filter(t => t.reminderTime && !t.completed).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#64748B' }}>暂无即将提醒</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
