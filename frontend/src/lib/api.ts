import { API_BASE_URL } from '../config/constants';
import type {
  ApiResponse,
  Project,
  CreateProjectRequest,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TimeEntry,
  CreateTimeEntryRequest,
  WeeklyInsight,
  DashboardStats,
} from '@shared/types/api';

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

// ─── Projects ───────────────────────────────────────────────────────────────
export const apiProjects = {
  getAll: () => request<Project[]>('/api/projects'),
  create: (data: CreateProjectRequest) => request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateProjectRequest>) => request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<null>(`/api/projects/${id}`, { method: 'DELETE' }),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const apiTasks = {
  getAll: (filters?: { status?: string; projectId?: string; completed?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.completed !== undefined) params.set('completed', String(filters.completed));
    const qs = params.toString();
    return request<Task[]>(`/api/tasks${qs ? '?' + qs : ''}`);
  },
  getToday: () => request<Task[]>('/api/tasks/today'),
  getOverdue: () => request<Task[]>('/api/tasks/overdue'),
  getById: (id: string) => request<Task>(`/api/tasks/${id}`),
  create: (data: CreateTaskRequest) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTaskRequest) => request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<null>(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// ─── Time Entries ─────────────────────────────────────────────────────────────
export const apiTimeEntries = {
  getAll: (filters?: { taskId?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.taskId) params.set('taskId', filters.taskId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const qs = params.toString();
    return request<TimeEntry[]>(`/api/time-entries${qs ? '?' + qs : ''}`);
  },
  getActive: () => request<TimeEntry | null>('/api/time-entries/active'),
  create: (data: CreateTimeEntryRequest) => request<TimeEntry>('/api/time-entries', { method: 'POST', body: JSON.stringify(data) }),
  stop: (id: string) => request<TimeEntry>(`/api/time-entries/${id}/stop`, { method: 'PUT' }),
  delete: (id: string) => request<null>(`/api/time-entries/${id}`, { method: 'DELETE' }),
};

// ─── Insights ────────────────────────────────────────────────────────────────
export const apiInsights = {
  getDashboard: () => request<DashboardStats>('/api/insights/dashboard'),
  getWeekly: () => request<WeeklyInsight>('/api/insights/weekly'),
};
