// Shared API types — single source of truth for frontend ↔ backend contracts.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Projects ───────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  color: string;
  description?: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done';
export type RepeatInterval = 'daily' | 'weekly' | 'monthly' | 'none';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  tags: string[];
  dueDate?: string;
  reminderTime?: string;
  reminderMinutesBefore?: number;
  repeatInterval: RepeatInterval;
  subtasks: SubTask[];
  totalTrackedSeconds: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  projectId?: string;
  tags?: string[];
  dueDate?: string;
  reminderTime?: string;
  reminderMinutesBefore?: number;
  repeatInterval?: RepeatInterval;
  subtasks?: { title: string; completed: boolean }[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  projectId?: string;
  tags?: string[];
  dueDate?: string;
  reminderTime?: string;
  reminderMinutesBefore?: number;
  repeatInterval?: RepeatInterval;
  subtasks?: SubTask[];
  completed?: boolean;
}

// ─── Time Entries ─────────────────────────────────────────────────────────────
export interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  notes?: string;
  createdAt: string;
}

export interface CreateTimeEntryRequest {
  taskId: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  notes?: string;
}

export interface UpdateTimeEntryRequest {
  endTime?: string;
  durationSeconds?: number;
  notes?: string;
}

// ─── Insights ────────────────────────────────────────────────────────────────
export interface WeeklyInsight {
  totalTrackedSeconds: number;
  totalTasksCompleted: number;
  totalTasksOverdue: number;
  completionRate: number;
  timeByProject: { projectName: string; projectColor: string; seconds: number }[];
  timeByDay: { date: string; seconds: number }[];
  aiInsight?: string;
}

export interface DashboardStats {
  todayTasksTotal: number;
  todayTasksCompleted: number;
  weekTrackedSeconds: number;
  completionRate: number;
  overdueCount: number;
  activeTimerTaskId?: string;
  activeTimerSeconds?: number;
}
