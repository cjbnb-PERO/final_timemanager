import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import {
  LayoutDashboard, ListTodo, Columns, Calendar, Clock, BarChart2,
  Plus, Bell, Menu, X, Search, FolderOpen
} from 'lucide-react';
import DashboardView from '../components/custom/DashboardView';
import TaskListView from '../components/custom/TaskListView';
import KanbanView from '../components/custom/KanbanView';
import CalendarView from '../components/custom/CalendarView';
import TimeTrackingView from '../components/custom/TimeTrackingView';
import InsightsView from '../components/custom/InsightsView';
import ProjectsView from '../components/custom/ProjectsView';
import TaskModal from '../components/custom/TaskModal';
import UserProfileModal from '../components/custom/UserProfileModal';
import { apiTimeEntries, apiTasks } from '../lib/api';
import type { Task, TimeEntry } from '@shared/types/api';

interface UserProfile {
  name: string;
  role: string;
  email?: string;
}

type View = 'dashboard' | 'tasks' | 'kanban' | 'calendar' | 'time' | 'insights' | 'projects';

const NAV_ITEMS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={16} /> },
  { id: 'tasks', label: '任务列表', icon: <ListTodo size={16} /> },
  { id: 'kanban', label: '看板视图', icon: <Columns size={16} /> },
  { id: 'calendar', label: '日历视图', icon: <Calendar size={16} /> },
  { id: 'time', label: '时间追踪', icon: <Clock size={16} /> },
  { id: 'insights', label: '数据洞察', icon: <BarChart2 size={16} /> },
  { id: 'projects', label: '项目管理', icon: <FolderOpen size={16} /> },
];

export default function Index() {
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Task[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { name: '张明', role: '产品经理' };
  });
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    apiTimeEntries.getActive().then(res => {
      if (res.success && res.data) {
        setActiveTimer(res.data);
        const elapsed = Math.floor((Date.now() - new Date(res.data.startTime).getTime()) / 1000);
        setTimerSeconds(elapsed);
      }
    });
  }, [refreshKey]);

  // 获取所有任务数据用于搜索建议
  useEffect(() => {
    apiTasks.getAll().then(res => {
      if (res.success) {
        setAllTasks(res.data);
      }
    });
  }, [refreshKey]);

  // 生成搜索建议
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchSuggestions(filtered.slice(0, 5)); // 最多显示5个建议
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allTasks]);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{id: string; title: string; message: string; time: string; type: 'reminder' | 'overdue'}[]>([]);

  // 生成通知数据
  useEffect(() => {
    const now = new Date();
    const notificationList: {id: string; title: string; message: string; time: string; type: 'reminder' | 'overdue'}[] = [];
    
    // 检查过期任务
    const overdueTasks = allTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now);
    overdueTasks.forEach(task => {
      notificationList.push({
        id: `overdue-${task.id}`,
        title: '任务已过期',
        message: `${task.title} 已于 ${new Date(task.dueDate!).toLocaleDateString('zh-CN')} 过期`,
        time: now.toLocaleTimeString('zh-CN'),
        type: 'overdue'
      });
    });
    
    // 检查即将提醒的任务
    const upcomingReminders = allTasks.filter(t => {
      if (!t.reminderTime || t.completed) return false;
      const reminderTime = new Date(t.reminderTime);
      const timeDiff = reminderTime.getTime() - now.getTime();
      return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // 24小时内
    });
    
    upcomingReminders.forEach(task => {
      notificationList.push({
        id: `reminder-${task.id}`,
        title: '任务提醒',
        message: `${task.title} 将在 ${new Date(task.reminderTime!).toLocaleString('zh-CN')} 提醒`,
        time: now.toLocaleTimeString('zh-CN'),
        type: 'reminder'
      });
    });
    
    setNotifications(notificationList);
  }, [allTasks]);

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    const res = await apiTimeEntries.stop(activeTimer.id);
    if (res.success) {
      setActiveTimer(null);
      setTimerSeconds(0);
      toast.success('计时已停止', { description: `共计记录 ${formatTime(timerSeconds)}` });
      refresh();
    }
  };

  const handleStartTimer = async (task: Task) => {
    if (activeTimer) {
      await handleStopTimer();
    }
    const res = await apiTimeEntries.create({ taskId: task.id, startTime: new Date().toISOString() });
    if (res.success && res.data) {
      setActiveTimer(res.data);
      setTimerSeconds(0);
      toast.success('开始计时', { description: task.title });
      refresh();
    }
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    refresh();
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const currentNavItem = NAV_ITEMS.find(n => n.id === view);

  return (
    <div className="flex min-h-screen" style={{ background: '#0A0F1E', color: '#F1F5F9', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <Toaster position="top-right" theme="dark" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 256, background: '#111827', borderRight: '1px solid #1E293B' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #1E293B' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
            <Clock size={14} color="white" />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: '#F1F5F9' }}>TimeTask Pro</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: view === item.id ? 'rgba(14,165,233,0.12)' : 'transparent',
                color: view === item.id ? '#0EA5E9' : '#64748B',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Active Timer in sidebar */}
        {activeTimer && (
          <div className="mx-4 mb-4 p-3 rounded-xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
              <span className="text-xs" style={{ color: '#10B981' }}>计时中</span>
            </div>
            <p className="font-mono text-lg font-bold" style={{ color: '#14B8A6' }}>{formatTime(timerSeconds)}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: '#64748B' }}>{activeTimer.taskTitle}</p>
            <button
              onClick={handleStopTimer}
              className="mt-2 w-full text-xs py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(244,63,94,0.12)', color: '#F43F5E' }}
            >
              停止计时
            </button>
          </div>
        )}

        {/* User */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid #1E293B' }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[#1E293B]"
            onClick={() => setShowUserProfileModal(true)}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', color: 'white' }}>
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{userProfile.name}</p>
              <p className="text-xs truncate" style={{ color: '#64748B' }}>{userProfile.role}</p>
            </div>
            <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen flex flex-col">
        <div className="lg:ml-64">
          {/* Top Header */}
          <header
            className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-4"
            style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1E293B' }}
          >
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-xl transition-colors"
                style={{ color: '#64748B' }}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="hidden lg:flex items-center gap-2" style={{ color: '#64748B' }}>
                <span className="text-sm">{currentNavItem?.icon}</span>
                <span className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{currentNavItem?.label}</span>
              </div>
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}>
                  <Clock size={12} color="white" />
                </div>
                <span className="font-bold text-sm">TimeTask Pro</span>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-sm hidden sm:block">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: '#64748B' }} />
                <input
                  type="search"
                  placeholder="搜索任务、项目…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // 当按下Enter键时，我们可以添加一个搜索反馈
                      if (searchQuery) {
                        toast.success('搜索完成', { description: `正在搜索: ${searchQuery}` });
                        setShowSuggestions(false);
                        // 跳转到任务列表页面
                        setView('tasks');
                      }
                    }
                  }}
                  onBlur={() => {
                    // 延迟关闭建议列表，以便用户可以点击建议
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-colors"
                  style={{ background: '#111827', border: '1px solid #1E293B', color: '#F1F5F9' }}
                />
                {/* 搜索建议列表 */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-50"
                    style={{ background: '#111827', border: '1px solid #1E293B' }}>
                    {searchSuggestions.map((task) => (
                      <div
                        key={task.id}
                        className="px-4 py-2 text-sm hover:bg-[#1E293B] cursor-pointer transition-colors"
                        style={{ color: '#F1F5F9' }}
                        onClick={() => {
                          setSearchQuery(task.title);
                          setShowSuggestions(false);
                          // 跳转到任务列表页面
                          setView('tasks');
                          // 当选择建议时，我们可以添加一个搜索反馈
                          toast.success('搜索完成', { description: `正在搜索: ${task.title}` });
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTimer && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: '#111827', border: '1px solid #1E293B' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                  <span className="font-mono text-sm font-semibold" style={{ color: '#14B8A6' }}>{formatTime(timerSeconds)}</span>
                  <span className="text-xs" style={{ color: '#64748B' }}>计时中</span>
                </div>
              )}
              <div className="relative">
                <button 
                  className="relative p-2 rounded-xl transition-colors hover:bg-[#111827] cursor-pointer"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={18} style={{ color: '#64748B' }} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#F43F5E' }} />
                  )}
                </button>
                
                {/* 通知面板 */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-lg z-50 overflow-hidden"
                    style={{ background: '#111827', border: '1px solid #1E293B' }}>
                    <div className="p-4 border-b border-[#1E293B]">
                      <h3 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>通知中心</h3>
                      <p className="text-xs" style={{ color: '#64748B' }}>共 {notifications.length} 条通知</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs" style={{ color: '#64748B' }}>暂无新通知</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div key={notification.id} className="p-4 border-b border-[#1E293B] hover:bg-[#1E293B] transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ 
                                  background: notification.type === 'overdue' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: notification.type === 'overdue' ? '#F43F5E' : '#F59E0B'
                                }}>
                                <span style={{ fontSize: 14 }}>{notification.type === 'overdue' ? '⏰' : '🔔'}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{notification.title}</p>
                                <p className="text-xs mt-1" style={{ color: '#64748B' }}>{notification.message}</p>
                                <p className="text-xs mt-1" style={{ color: '#475569' }}>{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-[#1E293B]">
                      <button className="w-full text-xs py-2 rounded-lg transition-colors hover:bg-[#1E293B]"
                        style={{ color: '#0EA5E9' }}
                        onClick={() => setShowNotifications(false)}
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleOpenNewTask}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">新建任务</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 sm:p-6">
            {view === 'dashboard' && (
              <DashboardView
                refreshKey={refreshKey}
                onNewTask={handleOpenNewTask}
                onEditTask={handleEditTask}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                activeTimer={activeTimer}
                timerSeconds={timerSeconds}
                onNavigate={setView as (v: string) => void}
              />
            )}
            {view === 'tasks' && (
              <TaskListView
                refreshKey={refreshKey}
                searchQuery={searchQuery}
                onNewTask={handleOpenNewTask}
                onEditTask={handleEditTask}
                onStartTimer={handleStartTimer}
                activeTimerId={activeTimer?.taskId}
                onRefresh={refresh}
              />
            )}
            {view === 'kanban' && (
              <KanbanView
                refreshKey={refreshKey}
                onEditTask={handleEditTask}
                onStartTimer={handleStartTimer}
                activeTimerId={activeTimer?.taskId}
                onRefresh={refresh}
              />
            )}
            {view === 'calendar' && (
              <CalendarView
                refreshKey={refreshKey}
                onEditTask={handleEditTask}
                onNewTask={handleOpenNewTask}
              />
            )}
            {view === 'time' && (
              <TimeTrackingView
                refreshKey={refreshKey}
                activeTimer={activeTimer}
                timerSeconds={timerSeconds}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onRefresh={refresh}
              />
            )}
            {view === 'insights' && (
              <InsightsView refreshKey={refreshKey} />
            )}
            {view === 'projects' && (
              <ProjectsView
                refreshKey={refreshKey}
                onRefresh={refresh}
              />
            )}
          </div>
        </div>
      </main>

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}

      {showUserProfileModal && (
        <UserProfileModal
          user={userProfile}
          onClose={() => setShowUserProfileModal(false)}
          onSave={(updatedUser) => {
            setUserProfile(updatedUser);
            setShowUserProfileModal(false);
          }}
        />
      )}
    </div>
  );
}
