-- TimeTask Pro initial migration

CREATE TABLE IF NOT EXISTS "Projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#0EA5E9',
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "Tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "priority" text NOT NULL DEFAULT 'medium',
  "status" text NOT NULL DEFAULT 'inbox',
  "project_id" uuid REFERENCES "Projects"("id") ON DELETE SET NULL,
  "tags" text NOT NULL DEFAULT '[]',
  "due_date" timestamp,
  "reminder_time" timestamp,
  "reminder_minutes_before" integer DEFAULT 15,
  "repeat_interval" text NOT NULL DEFAULT 'none',
  "subtasks" text NOT NULL DEFAULT '[]',
  "total_tracked_seconds" integer NOT NULL DEFAULT 0,
  "completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "TimeEntries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "Tasks"("id") ON DELETE CASCADE,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp,
  "duration_seconds" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default projects
INSERT INTO "Projects" ("name", "color", "description") VALUES
  ('产品迭代 Q1', '#0EA5E9', '产品季度迭代计划'),
  ('用户研究', '#6366F1', '用户访谈与研究'),
  ('市场推广', '#14B8A6', '市场营销活动')
ON CONFLICT DO NOTHING;
