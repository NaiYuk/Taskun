'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types/task'
import {LogOut, LucideActivity, LucideLoader, LucideCheck, LucidePackage, LucidePauseCircle, LucideSettings, X } from 'lucide-react'
import { TaskList } from '@/components/TaskList'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [taskStats, setTaskStats] = useState({ total: 0, todo: 0, in_progress: 0, done: 0 })
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftWebhookUrl, setDraftWebhookUrl] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // 初回ロード時にユーザー情報とタスクとWebhook URLを読み込む
  useEffect(() => {
    loadUser()
    loadTasks()
    const storedWebhookUrl = localStorage.getItem('slackWebhookUrl')
    if (storedWebhookUrl) {
      setSlackWebhookUrl(storedWebhookUrl)
      setDraftWebhookUrl(storedWebhookUrl)
    }
  }, [])
  
  /**
   * ユーザー情報の読み込み
   * @return {Promise<void>}
   */
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserEmail(user.email || '')
    } else {
      router.push('/login')
    }
  }

  /** 
   * タスク一覧の読み込み
   * @return {Promise<void>}
   */
  const loadTasks = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('タスク読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * ログアウト処理
   * @return {Promise<void>}
   */
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  /** 
   * Slack設定保存処理
   * @return {void}
   */
  const handleSaveSettings = () => {
    setSlackWebhookUrl(draftWebhookUrl)
    localStorage.setItem('slackWebhookUrl', draftWebhookUrl)
    setSettingsOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 to-black-800">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            
            {/* 左側ロゴ */}
            <div className="flex items-center gap-3">
              <LucidePackage className="h-8 w-8 text-green-900 inline-block mb-1" />
              <p className="text-2xl font-bold text-green-900">タスク管理アプリ たすくん。</p>
            </div>

            {/* 右側 ユーザー情報 */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <p className="py-1 text-sm text-gray-600">{userEmail} でログイン中</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LucideSettings className="h-5 w-5" />
                <p>設定</p>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <p>ログアウト</p>
              </button>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <h1 className="text-xl font-bold text-green-800 h-9">タスク統計情報</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-yellow-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">
              <LucideActivity className='h-5 w-5 mb-2 text-yellow-600'/>
              全体
            </div>
            <div className="text-3xl font-bold text-gray-900">{taskStats.total}</div>
          </div>
          <div className="bg-gray-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">
              <LucidePauseCircle className='h-5 w-5 mb-2 text-gray-600'/>
              未対応
            </div>
            <div className="text-3xl font-bold text-gray-600">{taskStats.todo}</div>
          </div>
          <div className="bg-indigo-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">
              <LucideLoader className='h-5 w-5 mb-2 text-indigo-600'/>
              対応中
            </div>
            <div className="text-3xl font-bold text-gray-600">{taskStats.in_progress}</div>
          </div>
          <div className="bg-green-200 bg-opacity-70 rounded-xl shadow-sm p-5 border border-green-300">
            <div className="text-sm text-gray-600 mb-1">
              <LucideCheck className='h-5 w-5 mb-2 text-green-600'/>
              完了
            </div>
            <div className="text-3xl font-bold text-gray-600">{taskStats.done}</div>
          </div>
        </div>
        <TaskList 
          userEmail={userEmail}
          onTasksChange={setTasks}
          onStatsChange={setTaskStats}
          slackWebhookUrl={slackWebhookUrl}
        />
      </main>
      {settingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">通知設定</h2>
                <p className="text-sm text-gray-500">Slack通知に使用するWebhook URLを設定します。</p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="設定を閉じる"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Slack Webhook URL</label>
              <input
                type="url"
                value={draftWebhookUrl}
                onChange={(e) => setDraftWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
              />
              <p className="text-xs text-gray-500">未入力の場合は環境変数のWebhook URLが利用されます。</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
