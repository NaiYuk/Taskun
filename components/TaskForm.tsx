'use client'

import { useEffect, useRef, useState} from 'react'
import { Task, TaskFormData, TaskStatus, TaskPriority } from '@/types/task'
import { LucideEdit, LucidePause, LucidePlus, Mic,  X } from 'lucide-react'

interface TaskFormProps {
  task?: Task
  onSubmit: (data: TaskFormData) => Promise<void>
  onClose: () => void
  defaultSlackWebhookUrl?: string
}

export default function TaskForm({ task, onSubmit, onClose, defaultSlackWebhookUrl }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    reminderEnabled: false,
    reminderTiming: 'start',
    reminderCustomTime: '',
    slackWebhookUrl: defaultSlackWebhookUrl || '',
  })
  const [loading, setLoading] = useState(false)
  const [listeningField, setListeningField] = useState<null | 'title' | 'description'>(null)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // 音声認識のサポート確認
  useEffect(() => {
    const isSupported = typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

    setIsSpeechSupported(isSupported)

    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    setFormData({
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      due_date: task?.due_date || '',
      reminderEnabled: false,
      reminderTiming: 'start',
      reminderCustomTime: '',
      slackWebhookUrl: defaultSlackWebhookUrl || '',
    })
  }, [task, defaultSlackWebhookUrl])

  useEffect(() => {
    if (!formData.slackWebhookUrl && defaultSlackWebhookUrl) {
      setFormData((prev) => ({ ...prev, slackWebhookUrl: defaultSlackWebhookUrl }))
    }
  }, [defaultSlackWebhookUrl, formData.slackWebhookUrl])

  /** 
   * フォーム送信処理
   * @param e {React.FormEvent}
   * @return {void}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (formData.reminderEnabled) {
        if (!formData.slackWebhookUrl) {
          alert('Slack Webhook URLを入力してください')
          setLoading(false)
          return
        }

        if (formData.reminderTiming === 'custom' && !formData.reminderCustomTime) {
          alert('カスタムのリマインド時間を入力してください')
          setLoading(false)
          return
        }
      }
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  /** 
   * 音声入力の開始・停止切り替え
   * @param field 'title' | 'description'
   * @return {void}
   */
  const handleSpeechToggle = (field: 'title' | 'description') => {
    if (!isSpeechSupported) return

    if (listeningField === field) {
      recognitionRef.current?.stop()
      setListeningField(null)
      return
    }

    recognitionRef.current?.stop()

    // 音声認識の初期化
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

    // 音声認識結果の処理
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setFormData((prev) => ({
        ...prev,
        [field]: `${prev[field]}${prev[field] ? ' ' : ''}${transcript}`,
      }))
    }
    // エラー処理
    recognition.onerror = () => {
      setListeningField(null)
    }
    // 終了処理
    recognition.onend = () => {
      setListeningField(null)
    }
    // 音声認識開始
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
                <option value="todo">未対応</option>
                <option value="in_progress">対応中</option>
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
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value || "" })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slackリマインド
                </label>
                <p className="text-xs text-gray-500">指定したタイミングでSlackに通知します</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <span className="sr-only">リマインドを有効化</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={formData.reminderEnabled}
                  onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${formData.reminderEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${formData.reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            {formData.reminderEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">リマインド時間</label>
                  <select
                    value={formData.reminderTiming}
                    onChange={(e) => setFormData({ ...formData, reminderTiming: e.target.value as TaskFormData['reminderTiming'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                  >
                    <option value="start">開始時</option>
                    <option value="10m">10分前</option>
                    <option value="1h">1時間前</option>
                    <option value="custom">カスタム</option>
                  </select>

                  {formData.reminderTiming === 'custom' && (
                    <input
                      type="datetime-local"
                      value={formData.reminderCustomTime}
                      onChange={(e) => setFormData({ ...formData, reminderCustomTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Slack Webhook URL <span className="text-red-500">* 必須</span>
                  </label>
                  <input
                    type="url"
                    required={formData.reminderEnabled}
                    value={formData.slackWebhookUrl}
                    onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500">通知先のSlackチャンネルのWebhook URLを入力してください</p>
                </div>
              </div>
            )}
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
