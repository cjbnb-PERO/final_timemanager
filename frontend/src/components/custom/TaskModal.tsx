import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { apiTasks, apiProjects } from '../../lib/api';
import type { Task, Project, SubTask } from '@shared/types/api';
import { toast } from 'sonner';

interface Props {
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'inbox');
  const [projectId, setProjectId] = useState(task?.projectId ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 16) : '');
  const [reminderTime, setReminderTime] = useState(task?.reminderTime ? task.reminderTime.slice(0, 16) : '');
  const [reminderMinutes, setReminderMinutes] = useState(task?.reminderMinutesBefore ?? 15);
  const [repeatInterval, setRepeatInterval] = useState<Task['repeatInterval']>(task?.repeatInterval ?? 'none');
  const [tags, setTags] = useState<string[]>(typeof task?.tags === 'string' ? JSON.parse(task.tags) : task?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>(typeof task?.subtasks === 'string' ? JSON.parse(task.subtasks) : task?.subtasks ?? []);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiProjects.getAll().then(res => {
      if (res.success) setProjects(res.data);
    });
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!tags.includes(tagInput.trim())) setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && subtaskInput.trim()) {
      setSubtasks(prev => [...prev, { id: Date.now().toString(), title: subtaskInput.trim(), completed: false }]);
      setSubtaskInput('');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('请输入任务标题'); return; }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        projectId: projectId || undefined,
        tags,
        dueDate: dueDate || undefined,
        reminderTime: reminderTime || undefined,
        reminderMinutesBefore: reminderMinutes,
        repeatInterval,
        subtasks,
      };
      let res;
      if (task) {
        res = await apiTasks.update(task.id, data);
      } else {
        res = await apiTasks.create(data);
      }
      if (res.success) {
        toast.success(task ? '任务已更新' : '任务已创建');
        onSaved();
      } else {
        toast.error('保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#111827', border: '1px solid #1E293B' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
          <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
            {task ? '编辑任务' : '新建任务'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#1E293B]">
            <X size={16} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>任务标题 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入任务标题…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>备注</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="添加任务描述…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>优先级</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task['priority'])}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              >
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>状态</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Task['status'])}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              >
                <option value="inbox">收件箱</option>
                <option value="todo">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>所属项目</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            >
              <option value="">无项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Due Date + Reminder */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>截止日期</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>提醒时间</label>
              <input
                type="datetime-local"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Reminder Minutes + Repeat */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>提前提醒（分钟）</label>
              <select
                value={reminderMinutes}
                onChange={e => setReminderMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              >
                <option value={5}>5 分钟</option>
                <option value={15}>15 分钟</option>
                <option value={30}>30 分钟</option>
                <option value={60}>1 小时</option>
                <option value={120}>2 小时</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>重复周期</label>
              <select
                value={repeatInterval}
                onChange={e => setRepeatInterval(e.target.value as Task['repeatInterval'])}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              >
                <option value="none">不重复</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
                  #{tag}
                  <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="输入标签名按 Enter 添加…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>子任务</label>
            <div className="space-y-2 mb-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B' }}>
                  <button
                    onClick={() => setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))}
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      border: `2px solid ${sub.completed ? '#10B981' : '#1E293B'}`,
                      background: sub.completed ? 'rgba(16,185,129,0.1)' : 'transparent',
                    }}
                  >
                    {sub.completed && <span style={{ color: '#10B981', fontSize: 8 }}>✓</span>}
                  </button>
                  <span className={`flex-1 text-xs ${sub.completed ? 'line-through' : ''}`}
                    style={{ color: sub.completed ? '#64748B' : '#F1F5F9' }}>
                    {sub.title}
                  </span>
                  <button onClick={() => setSubtasks(prev => prev.filter(s => s.id !== sub.id))}>
                    <Trash2 size={11} style={{ color: '#F43F5E' }} />
                  </button>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={handleAddSubtask}
              placeholder="输入子任务按 Enter 添加…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #1E293B' }}>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm transition-colors"
            style={{ border: '1px solid #1E293B', color: '#64748B' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
          >
            {saving ? '保存中…' : task ? '保存修改' : '创建任务'}
          </button>
        </div>
      </div>
    </div>
  );
}
