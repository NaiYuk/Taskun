'use client'

import { useEffect, useRef, useState} from 'react'
import { Task, TaskFormData, TaskStatus, TaskPriority } from '@/types/task'
import { LucideEdit, LucidePause, LucidePlus, Mic,  X } from 'lucide-react'

interface TaskFormProps {
  task?: Task
  onSubmit: (data: TaskFormData) => Promise<void>
  onClose: () => void
}

export default function TaskForm({ task, onSubmit, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
  })
  const [loading, setLoading] = useState(false)
  const [listeningField, setListeningField] = useState<null | 'title' | 'description'>(null)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

    setIsSpeechSupported(isSupported)

    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeechToggle = (field: 'title' | 'description') => {
    if (!isSpeechSupported) return

    if (listeningField === field) {
      recognitionRef.current?.stop()
      setListeningField(null)
      return
    }

    recognitionRef.current?.stop()

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setFormData((prev) => ({
        ...prev,
        [field]: `${prev[field]}${prev[field] ? ' ' : ''}${transcript}`,
      }))
    }

    recognition.onerror = () => {
      setListeningField(null)
    }

    recognition.onend = () => {
      setListeningField(null)
    }

    recognition.start()
    setListeningField(field)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            <div className="flex items-center gap-2 mt-2">
              {task ? <LucideEdit /> : <LucidePlus />}
              {task ? 'タスクを編集' : '新しいタスク'}
            </div>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">* 必須</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 ${listeningField === 'title' ? 'ring-2 ring-green-500 border-green-500' : ''}`}
                placeholder="タスクのタイトルを入力"
              />
              <button
                type="button"
                onClick={() => handleSpeechToggle('title')}
                disabled={!isSpeechSupported}
                aria-pressed={listeningField === 'title'}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                title={isSpeechSupported ? 'タイトルを音声入力する' : '音声入力はこのブラウザでサポートされていません'}
              >
                {listeningField === 'title' ? <LucidePause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="sr-only">タイトルを音声入力</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <div className="flex gap-2">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 resize-none ${listeningField === 'description' ? 'ring-2 ring-green-500 border-green-500' : ''}`}
                placeholder="タスクの詳細を入力"
              />
              <button
                type="button"
                onClick={() => handleSpeechToggle('description')}
                disabled={!isSpeechSupported}
                aria-pressed={listeningField === 'description'}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                title={isSpeechSupported ? '説明を音声入力する' : '音声入力はこのブラウザでサポートされていません'}
              >
                {listeningField === 'description' ? <LucidePause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="sr-only">説明を音声入力</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
              >
                <option value="todo">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                優先度
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期限日
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? '処理中...' : task ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
