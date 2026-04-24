import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

interface Props {
  user: UserProfile;
  onClose: () => void;
  onSave: (user: UserProfile) => void;
}

export default function UserProfileModal({ user, onClose, onSave }: Props) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入用户名');
      return;
    }
    setSaving(true);
    try {
      const updatedUser = {
        name: name.trim(),
        role: role.trim() || '用户',
        email: email.trim() || undefined,
      };
      localStorage.setItem('userProfile', JSON.stringify(updatedUser));
      toast.success('用户信息已更新');
      onSave(updatedUser);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#111827', border: '1px solid #1E293B' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
          <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>编辑用户信息</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-[#1E293B]">
            <X size={16} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', color: 'white' }}>
              {name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>用户名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入用户名"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>职位/角色</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="输入职位或角色"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#64748B' }}>邮箱（选填）</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="输入邮箱地址"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: '#0A0F1E', border: '1px solid #1E293B', color: '#F1F5F9' }}
            />
          </div>
        </div>

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
            {saving ? '保存中…' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}