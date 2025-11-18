'use client'

import { Task } from '@/types/task'
import { Edit2, Trash2, Calendar, Flag, LucideStopCircle, LucideLoader, LucideCheck } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const statusColors = {
  todo: 'bg-gray-100 text-gray-800 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  done: 'bg-green-100 text-green-800 border-green-300',
}

const statusLabels = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
}

const statusIcons = {
  todo: <LucideStopCircle className='h-4 w-4'/>,
  in_progress: <LucideLoader className='h-4 w-4'/>,
  done: <LucideCheck className='h-4 w-4'/>,
}

const priorityColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
}

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 border border-gray-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-green-800 flex-1 line-clamp-2">
          {task.title}
        </h3>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="編集"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('このタスクを削除してもよろしいですか?')) {
                onDelete(task.id)
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
          <div className="flex items-center gap-1">
            {statusIcons[task.status]}
            {statusLabels[task.status]}
          </div>
        </span>
        <span className={`flex items-center gap-1 text-xs font-medium ${priorityColors[task.priority]}`}>
          <Flag className="h-3 w-3" />
          優先度: {priorityLabels[task.priority]}
        </span>
      </div>

      {task.due_date && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          期限: {new Date(task.due_date).toLocaleDateString('ja-JP')}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        作成: {new Date(task.created_at).toLocaleDateString('ja-JP', { 
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  )
}
