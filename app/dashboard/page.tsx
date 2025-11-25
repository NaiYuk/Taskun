'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types/task'
import {LogOut,  LucideStopCircle, LucideActivity, LucideLoader, LucideCheck } from 'lucide-react'
import { TaskList } from '@/components/TaskList'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
  const [clearSignal, setClearSignal] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadTasks()
  }, [])
  
  // ユーザー情報の読み込み 
  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserEmail(user.email || '')
    } else {
      router.push('/login')
    }
  }

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
      setFilteredTasks(data || [])
    } catch (error) {
      console.error('タスク読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }


  // タスク統計情報の計算
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 to-black-800">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-900">タスク管理アプリ　たすくん。</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="py-1 text-sm text-gray-600">{userEmail} でログイン中</p>
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
              <LucideStopCircle className='h-5 w-5 mb-2 text-gray-600'/>
              未着手
            </div>
            <div className="text-3xl font-bold text-gray-600">{taskStats.todo}</div>
          </div>
          <div className="bg-indigo-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">
              <LucideLoader className='h-5 w-5 mb-2 text-indigo-600'/>
              進行中
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
            page={page}
            userEmail={userEmail}
            onChangePage={(newPage: number) => setPage(newPage)}
            filter={filters}
            onClearFilter={() => {
              setFilters({ search: '', status: '', priority: '' })
              setClearSignal(true)
            }}
          />
      </main>
    </div>
  )
}
