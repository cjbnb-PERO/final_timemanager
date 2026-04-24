# TimeTask Pro — 任务时间管理平台

## 项目结构

```
.
├── backend/
│   ├── config/
│   │   └── constants.ts          # 服务器配置
│   ├── db/
│   │   ├── index.ts              # Drizzle + postgres.js 连接
│   │   ├── schema.ts             # Projects / Tasks / TimeEntries 表定义
│   │   └── migrations/
│   │       └── 1774054660463_init_timetask.sql
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── repositories/
│   │   ├── projects.ts           # 项目 CRUD
│   │   ├── tasks.ts              # 任务 CRUD + 过滤
│   │   └── timeEntries.ts        # 时间条目 CRUD + 统计
│   ├── routes/
│   │   ├── projects.ts           # GET/POST/PUT/DELETE /api/projects
│   │   ├── tasks.ts              # GET/POST/PUT/DELETE /api/tasks
│   │   ├── timeEntries.ts        # GET/POST/PUT/DELETE /api/time-entries
│   │   └── insights.ts           # GET /api/insights/dashboard|weekly
│   └── server.ts                 # Express 入口
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/               # shadcn/ui 组件（勿修改）
│       │   └── custom/
│       │       ├── DashboardView.tsx     # 仪表盘（Bento Grid + 计时器 + 洞察）
│       │       ├── TaskListView.tsx      # 任务列表（筛选 + 子任务 + 标签）
│       │       ├── KanbanView.tsx        # 看板（拖拽切换状态 + 移动端列切换）
│       │       ├── CalendarView.tsx      # 日历（月视图 + 当日任务）
│       │       ├── TimeTrackingView.tsx  # 时间追踪（计时器 + 手动记录 + 列表）
│       │       ├── InsightsView.tsx      # 数据洞察（图表 + AI洞察 + PDF导出）
│       │       ├── ProjectsView.tsx      # 项目管理（创建/编辑/删除项目）
│       │       └── TaskModal.tsx         # 任务创建/编辑弹窗
│       ├── config/
│       │   └── constants.ts      # API_BASE_URL
│       ├── lib/
│       │   └── api.ts            # apiProjects / apiTasks / apiTimeEntries / apiInsights
│       ├── pages/
│       │   └── Index.tsx         # 主入口：导航 + 布局 + 计时器状态
│       ├── types/
│       │   └── index.ts          # 前端专用类型
│       └── index.css             # Tailwind v4 + Obsidian Command 主题
└── shared/
    └── types/
        └── api.ts                # 前后端共享类型（Project/Task/TimeEntry/Insights）
```

## 功能列表

- **仪表盘**: Bento Grid 统计卡片、快速添加任务、今日任务列表、实时计时器、本周时间分布、AI 洞察、日历条、看板概览、重复任务、提醒列表
- **任务管理**: 完整 CRUD、子任务、标签、优先级、状态、项目关联、截止日期、提醒时间、重复周期、按状态分组
- **看板视图**: 拖拽切换任务状态（收件箱/待处理/进行中/已完成）、移动端列切换、点击编辑
- **日历视图**: 月视图导航、点击日期查看当日任务
- **时间追踪**: 实时计时器、手动添加时间记录、时间条目列表、按日分组、日期范围筛选
- **数据洞察**: 每日柱状图、项目占比、AI 洞察、效率提示、周报导出
- **项目管理**: 创建/编辑/删除项目、颜色选择、任务数量统计

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS v4 + shadcn/ui + React Router (HashRouter)
- **后端**: Express.js + TypeScript + Drizzle ORM + postgres.js
- **数据库**: PostgreSQL
- **主题**: Obsidian Command 深色主题（#0A0F1E 背景，#0EA5E9 主色，#14B8A6 青色强调）

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取所有项目 |
| POST | /api/projects | 创建项目 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| GET | /api/tasks | 获取任务（支持 status/projectId/completed 筛选） |
| GET | /api/tasks/today | 今日任务 |
| GET | /api/tasks/overdue | 逾期任务 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| GET | /api/time-entries | 时间条目（支持日期筛选） |
| GET | /api/time-entries/active | 当前活跃计时 |
| POST | /api/time-entries | 创建时间条目（支持手动记录） |
| PUT | /api/time-entries/:id/stop | 停止计时 |
| DELETE | /api/time-entries/:id | 删除时间条目 |
| GET | /api/insights/dashboard | 仪表盘统计 |
| GET | /api/insights/weekly | 周报数据 |

## 代码生成指南

- 共享类型定义在 `shared/types/api.ts`，前端使用 `@shared` 别名导入
- 后端遵循: routes → repositories → db（无 service 层）
- 任务的 tags/subtasks 存储为 JSON 字符串，读取时解析
- 前端导航状态由 Index.tsx 统一管理，计时器状态提升到顶层
- 所有视图组件通过 props 接收 refreshKey 触发数据重载
- 视图类型: 'dashboard' | 'tasks' | 'kanban' | 'calendar' | 'time' | 'insights' | 'projects'
- 深色主题颜色: 背景 #0A0F1E, 卡片 #111827, 边框 #1E293B, 主色 #0EA5E9, 青色 #14B8A6
