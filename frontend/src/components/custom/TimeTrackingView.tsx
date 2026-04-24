import { useState, useEffect } from 'react';
import { Play, Square, Trash2, Clock, Plus, X } from 'lucide-react';
import { apiTimeEntries, apiTasks } from '../../lib/api';
import type { TimeEntry, Task } from '@shared/types/api';
import { toast } from 'sonner';

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  refreshKey: number;
  activeTimer: TimeEntry | null;
  timerSeconds: number;
  onStartTimer: (task: Task) => void;
  onStopTimer: () => void;
  onRefresh: () => void;
}

export default function TimeTrackingView({ refreshKey, activeTimer, timerSeconds, onStartTimer, onStopTimer, onRefresh }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('week');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let startDate: Date | undefined;
    if (dateFilter === 'today') {
      startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 30);
    }
    Promise.all([
      apiTimeEntries.getAll(startDate ? { startDate: startDate.toISOString() } : {}),
      apiTasks.getAll(),
    ]).then(([entriesRes, tasksRes]) => {
      if (entriesRes.success) setEntries(entriesRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
    }).finally(() => setLoading(false));
  }, [refreshKey, dateFilter]);

  const handleStartSelected = () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) { toast.error('请选择任务'); return; }
    onStartTimer(task);
  };

  const handleDeleteEntry = async (id: string) => {
    const res = await apiTimeEntries.delete(id);
    if (res.success) {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('时间记录已删除');
      onRefresh();
    }
  };

  const handleManualSave = async () => {
    if (!manualTaskId) { toast.error('请选择任务'); return; }
    if (!manualStart) { toast.error('请填写开始时间'); return; }
    setSavingManual(true);
    try {
      const startTime = new Date(manualStart).toISOString();
      const endTime = manualEnd ? new Date(manualEnd).toISOString() : undefined;
      const durationSeconds = endTime
        ? Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000))
        : 0;
      const res = await apiTimeEntries.create({
        taskId: manualTaskId,
        startTime,
        endTime,
        durationSeconds,
        notes: manualNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('时间记录已添加');
        setShowManualForm(false);
        setManualTaskId('');
        setManualStart('');
        setManualEnd('');
        setManualNotes('');
        onRefresh();
      }
    } finally {
      setSavingManual(false);
    }
  };

  const totalSeconds = entries.filter(e => e.endTime).reduce((s, e) => s + e.durationSeconds, 0);

  const grouped: Record<string, TimeEntry[]> = {};
  for (const e of entries) {
    const day = new Date(e.startTime).toLocaleDateString('zh-CN');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>时间追踪</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>记录并分析您的工作时间</p>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: '#111827', border: '1px solid #1E293B', color: '#64748B' }}
        >
          <Plus size={14} />手动记录
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #111827, #0A0F1E)', border: '1px solid #1E293B' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.06), transparent)' }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>计时器</h3>
                {activeTimer && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                    <span className="text-xs" style={{ color: '#10B981' }}>运行中</span>
                  </div>
                )}
              </div>
              <div className="text-center py-4">
                <p className="font-mono text-5xl font-bold" style={{ color: activeTimer ? '#14B8A6' : '#1E293B' }}>
                  {formatSeconds(timerSeconds)}
                </p>
                {activeTimer && (
                  <p className="text-xs mt-2 truncate" style={{ color: '#64748B' }}>{activeTimer.taskTitle}</p>
                )}
              </div>
              {activeTimer ? (
                <button
                  onClick={onStopTimer}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(244,63,94,0.12)', color: '#F43F5E' }}
                >
                  <Square size={14} />停止计时
                </button>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: '#1E293B', color: '#F1F5F9', border: '1px solid #1E293B' }}
                  >
                    <option value="">选择任务…</option>
                    {tasks.filter(t => !t.completed).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartSelected}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
                  >
                    <Play size={14} />开始计时
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#F1F5F9' }}>时间统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#64748B' }}>总计时间</span>
                <span className="text-sm font-mono font-semibold" style={{ color: '#14B8A6' }}>{formatDuration(totalSeconds)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#64748B' }}>记录条数</span>
                <span className="text-sm font-mono font-semibold" style={{ color: '#F1F5F9' }}>{entries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#64748B' }}>平均时长</span>
                <span className="text-sm font-mono font-semibold" style={{ color: '#F1F5F9' }}>
                  {entries.filter(e => e.endTime).length > 0
                    ? formatDuration(Math.floor(totalSeconds / entries.filter(e => e.endTime).length))
                    : '0m'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>时间记录</h2>
            <div className="flex items-center gap-2">
              {(['today', 'week', 'month'] as const).map(f => (
                <button key={f}
                  onClick={() => setDateFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: dateFilter === f ? 'rgba(14,165,233,0.12)' : 'transparent',
                    color: dateFilter === f ? '#0EA5E9' : '#64748B',
                    border: dateFilter === f ? 'none' : '1px solid #1E293B',
                  }}
                >
                  {f === 'today' ? '今天' : f === 'week' ? '本周' : '本月'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#111827' }} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
              <Clock size={32} className="mx-auto mb-3" style={{ color: '#1E293B' }} />
              <p className="text-sm" style={{ color: '#64748B' }}>暂无时间记录</p>
              <button
                onClick={() => setShowManualForm(true)}
                className="mt-3 text-xs px-4 py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}
              >
                手动添加记录
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([day, dayEntries]) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{day}</span>
                    <span className="text-xs font-mono" style={{ color: '#14B8A6' }}>
                      {formatDuration(dayEntries.filter(e => e.endTime).reduce((s, e) => s + e.durationSeconds, 0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map(entry => (
                      <div key={entry.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: '#111827', border: '1px solid #1E293B' }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: entry.endTime ? 'rgba(20,184,166,0.1)' : 'rgba(16,185,129,0.1)' }}>
                          <Clock size={14} style={{ color: entry.endTime ? '#14B8A6' : '#10B981' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{entry.taskTitle ?? '未知任务'}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {entry.projectName && (
                              <span className="text-xs" style={{ color: entry.projectColor ?? '#64748B' }}>#{entry.projectName}</span>
                            )}
                            <span className="text-xs" style={{ color: '#64748B' }}>
                              {new Date(entry.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                              {entry.endTime
                                ? ` — ${new Date(entry.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                                : ' — 进行中'}
                            </span>
                            {entry.notes && (
                              <span className="text-xs truncate max-w-[100px]" style={{ color: '#64748B' }}>{entry.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-mono font-semibold flex-shrink-0" style={{ color: '#14B8A6' }}>
                          {entry.endTime ? formatDuration(entry.durationSeconds) : formatSeconds(timerSeconds)}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                          style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowManualForm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
              <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>手动添加时间记录</h2>
              <button onClick={() => setShowManualForm(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#1E293B]">
                <X size={16} style={{ color: '#64748B' }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>关联任务 *</label>
                <select
                  value={manualTaskId}
                  onChange={e => setManualTaskId(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
                >
                  <option value="">选择任务…</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>开始时间 *</label>
                  <input
                    type="datetime-local"
                    value={manualStart}
                    onChange={e => setManualStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>结束时间</label>
                  <input
                    type="datetime-local"
                    value={manualEnd}
                    onChange={e => setManualEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9', colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>备注</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="添加备注…"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #1E293B' }}>
              <button
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #1E293B', color: '#64748B' }}
              >
                取消
              </button>
              <button
                onClick={handleManualSave}
                disabled={savingManual}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
              >
                {savingManual ? '保存中…' : '添加记录'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
