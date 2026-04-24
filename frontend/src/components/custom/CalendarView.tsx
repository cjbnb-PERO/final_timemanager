import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { apiTasks } from '../../lib/api';
import type { Task } from '@shared/types/api';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PRIORITY_COLORS: Record<string, string> = { high: '#F43F5E', medium: '#F59E0B', low: '#10B981' };

interface Props {
  refreshKey: number;
  onEditTask: (task: Task) => void;
  onNewTask: () => void;
}

export default function CalendarView({ refreshKey, onEditTask, onNewTask }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    apiTasks.getAll().then(res => {
      if (res.success) setTasks(res.data);
    });
  }, [refreshKey]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getTasksForDate = (day: number) => {
    const date = new Date(year, month, day);
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const selectedTasks = selectedDate
    ? tasks.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate();
      })
    : [];

  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>日历视图</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>按日期查看任务分布</p>
        </div>
        <button
          onClick={onNewTask}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
        >
          <Plus size={14} />新建任务
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#1E293B]">
              <ChevronLeft size={16} style={{ color: '#64748B' }} />
            </button>
            <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
              {year}年 {month + 1}月
            </h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#1E293B]">
              <ChevronRight size={16} style={{ color: '#64748B' }} />
            </button>
          </div>

          {/* Week headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: '#64748B' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayTasks = getTasksForDate(day);
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const isSelected = selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month && selectedDate?.getDate() === day;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className="aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 cursor-pointer transition-all"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #0EA5E9, #14B8A6)' : isToday ? 'rgba(14,165,233,0.15)' : '#1E293B',
                    border: isToday && !isSelected ? '1px solid rgba(14,165,233,0.4)' : '1px solid transparent',
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: isSelected ? 'white' : isToday ? '#0EA5E9' : '#F1F5F9' }}>{day}</span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayTasks.slice(0, 3).map((t, ti) => (
                        <span key={ti} className="w-1 h-1 rounded-full" style={{ background: PRIORITY_COLORS[t.priority] }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Tasks */}
        <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            {selectedDate ? selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) : '选择日期'}
          </h3>
          {selectedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm" style={{ color: '#64748B' }}>当日无任务</p>
              <button
                onClick={onNewTask}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}
              >
                添加任务
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="p-3 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B' }}
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}
                        style={{ color: task.completed ? '#64748B' : '#F1F5F9' }}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                          {new Date(task.dueDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {task.projectName && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block"
                          style={{ background: `${task.projectColor ?? '#64748B'}18`, color: task.projectColor ?? '#64748B' }}>
                          #{task.projectName}
                        </span>
                      )}
                    </div>
                    {task.completed && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
