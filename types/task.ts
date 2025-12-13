export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface TaskFormData {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  reminderEnabled?: boolean
  reminderTiming?: 'start' | '10m' | '1h' | 'custom'
  reminderCustomTime?: string
  slackWebhookUrl?: string
}
