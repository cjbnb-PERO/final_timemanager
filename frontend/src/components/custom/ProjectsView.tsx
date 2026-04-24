import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, FolderOpen, X, Check } from 'lucide-react';
import { apiProjects, apiTasks } from '../../lib/api';
import type { Project } from '@shared/types/api';
import { toast } from 'sonner';

const PROJECT_COLORS = [
  '#0EA5E9', '#14B8A6', '#6366F1', '#F59E0B', '#10B981',
  '#F43F5E', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

interface Props {
  refreshKey: number;
  onRefresh: () => void;
}

export default function ProjectsView({ refreshKey, onRefresh }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#0EA5E9');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiProjects.getAll(), apiTasks.getAll()])
      .then(([projRes, tasksRes]) => {
        if (projRes.success) setProjects(projRes.data);
        if (tasksRes.success) {
          const counts: Record<string, number> = {};
          for (const t of tasksRes.data) {
            if (t.projectId) counts[t.projectId] = (counts[t.projectId] ?? 0) + 1;
          }
          setTaskCounts(counts);
        }
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const openCreate = () => {
    setEditingProject(null);
    setFormName('');
    setFormColor('#0EA5E9');
    setFormDesc('');
    setShowForm(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setFormName(p.name);
    setFormColor(p.color);
    setFormDesc(p.description ?? '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('请输入项目名称'); return; }
    setSaving(true);
    try {
      if (editingProject) {
        const res = await apiProjects.update(editingProject.id, { name: formName.trim(), color: formColor, description: formDesc.trim() || undefined });
        if (res.success) {
          setProjects(prev => prev.map(p => p.id === editingProject.id ? res.data : p));
          toast.success('项目已更新');
          setShowForm(false);
          onRefresh();
        }
      } else {
        const res = await apiProjects.create({ name: formName.trim(), color: formColor, description: formDesc.trim() || undefined });
        if (res.success) {
          setProjects(prev => [...prev, res.data]);
          toast.success('项目已创建');
          setShowForm(false);
          onRefresh();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiProjects.delete(id);
    if (res.success) {
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('项目已删除');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>项目管理</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>共 {projects.length} 个项目</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
        >
          <Plus size={14} />新建项目
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: '#111827' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
          <FolderOpen size={40} className="mx-auto mb-3" style={{ color: '#1E293B' }} />
          <p className="font-medium" style={{ color: '#F1F5F9' }}>暂无项目</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>点击新建项目开始创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const count = taskCounts[p.id] ?? 0;
            return (
              <div key={p.id}
                className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 group"
                style={{ background: '#111827', border: '1px solid #1E293B' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${p.color}18` }}>
                      <FolderOpen size={18} style={{ color: p.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: '#F1F5F9' }}>{p.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{count} 项任务</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                {p.description && (
                  <p className="text-xs leading-relaxed mb-3" style={{ color: '#64748B' }}>{p.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-xs" style={{ color: '#64748B' }}>{p.color}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#64748B' }}>
                    {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="mt-3 w-full rounded-full h-1" style={{ background: '#1E293B' }}>
                  <div className="h-1 rounded-full" style={{ width: `${Math.min(count * 10, 100)}%`, background: p.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl" style={{ background: '#111827', border: '1px solid #1E293B' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
              <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>
                {editingProject ? '编辑项目' : '新建项目'}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#1E293B]">
                <X size={16} style={{ color: '#64748B' }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>项目名称 *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="输入项目名称…"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>项目描述</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="添加项目描述…"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#64748B' }}>项目颜色</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className="w-8 h-8 rounded-xl transition-all flex items-center justify-center"
                      style={{
                        background: c,
                        outline: formColor === c ? `2px solid ${c}` : 'none',
                        outlineOffset: 2,
                        transform: formColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {formColor === c && <Check size={12} color="white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #1E293B' }}>
              <button
                onClick={() => setShowForm(false)}
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
                {saving ? '保存中…' : editingProject ? '保存修改' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
