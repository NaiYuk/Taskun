'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskFormData } from '@/types/task'
import TaskCard from '@/components/TaskCard'
import TaskForm from '@/components/TaskForm'
import SearchBar from '@/components/SearchBar'
import { Plus, LogOut, Loader2, SortAsc, SortAscIcon, LucideSortAsc, LucideSortDesc, LucideSaveAll, LucidePentagon, LucideAlignHorizontalSpaceAround, LucideStopCircle, LucideBetweenHorizonalEnd, LucideActivity, LucideLoader, LucideCheck } from 'lucide-react'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [sortChange, setSortChange] = useState<boolean>(true) // true: 昇順、false: 降順
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  // 初期データ取得とリアルタイム購読
  useEffect(() => {
    loadUser()
    loadTasks()
    
    // Supabaseのリアルタイム購読を設定
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('リアルタイム更新:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task
            setTasks((prev) => [newTask, ...prev])
            setFilteredTasks((prev) => [newTask, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task
            setTasks((prev) =>
              prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
            )
            setFilteredTasks((prev) =>
              prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setTasks((prev) => prev.filter((task) => task.id !== deletedId))
            setFilteredTasks((prev) => prev.filter((task) => task.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  // タスク検索処理（LIKE検索）
  const handleSearch = (filters: { search: string; status: string; priority: string }) => {
    let filtered = [...tasks]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.status) {
      filtered = filtered.filter((task) => task.status === filters.status)
    }

    if (filters.priority) {
      filtered = filtered.filter((task) => task.priority === filters.priority)
    }

    setFilteredTasks(filtered)
  }

  // タスクの日付でソートを切り替える処理
  const handleChangeSort = () => {
    if (!sortChange) {
      const sorted = [...filteredTasks].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setFilteredTasks(sorted)
      // 昇順ソートボタンを押した後に降順ソートボタンに切り替える
      setSortChange(true)
    } else {
      const sorted = [...filteredTasks].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setFilteredTasks(sorted)
      // 降順ソートボタンを押した後に昇順ソートボタンに切り替える
      setSortChange(false)
    }
  }

  // タスク作成処理
  const handleCreateTask = async (data: TaskFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          description: data.description || null,
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          due_date: data.due_date || null,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Slack通知を送信
      await fetch('/api/slack/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'created',
          task: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          },
          user_email: userEmail,
        }),
      })

      setShowForm(false)
      setTasks((prev) => [task, ...prev])
      setFilteredTasks((prev) => [task, ...prev])
      
    } catch (error) {
      console.error('タスク作成エラー:', error)
      alert('タスクの作成に失敗しました')
    }
  }

  // タスク更新処理
  const handleUpdateTask = async (data: TaskFormData) => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTask.id)

      if (error) throw error

      setShowForm(false)
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, ...data, updated_at: new Date().toISOString() }
            : task
        )
      )
      setFilteredTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, ...data, updated_at: new Date().toISOString() }
            : task
        )
      )
      setEditingTask(undefined)
    } catch (error) {
      console.error('タスク更新エラー:', error)
      alert('タスクの更新に失敗しました')
    }
  }

  // タスク削除処理
  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      setTasks((prev) => prev.filter((task) => task.id !== id))
      setFilteredTasks((prev) => prev.filter((task) => task.id !== id))

      if (error) throw error
    } catch (error) {
      console.error('タスク削除エラー:', error)
      alert('タスクの削除に失敗しました')
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // タスク編集のためのフォーム表示
  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }


  // フォームを閉じる
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(undefined)
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

        {/* 検索バーと新規作成ボタン */}
        <div className="flex gap-4 items-center mt-8">
          <h1 className="text-xl font-bold text-green-800 h-9">検索・新規作成</h1>
          <p className="text-sm text-gray-500 pb-2">キーワード検索・条件検索</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <button
            onClick={() => {
              setEditingTask(undefined)
              setShowForm(true)
            }}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="h-5 w-5" />
            新規タスク
          </button>
        </div>

        {/* タスク一覧 */}
        <div className="flex gap-4 items-center mt-8">
          <h1 className="text-xl font-bold text-green-800 h-9">タスク一覧</h1>
          {/* ソートを行うボタン */}
          <div>
            <button
              onClick={handleChangeSort}
              className="p-2 mb-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="日付でソート"
            >
              {/* <button
                onClick={() => onEdit(task)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="編集"
              >
                <Edit2 className="h-4 w-4" />
              </button> */}
              {sortChange ? (
                <LucideSortDesc className="h-6 w-6 border-rounded text-gray-600 hover:text-green-800" aria-label="日付降順でソート" />
              ) : (
                <LucideSortAsc className="h-6 w-6 border-rounded text-gray-600 hover:text-green-800" aria-label="日付昇順でソート" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 pb-2">(タスクの編集・削除もこちらで行います)</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg mb-2">
              {tasks.length === 0 ? 'タスクがありません' : '検索結果がありません'}
            </div>
            <p className="text-gray-500 text-sm">
              {tasks.length === 0 && '新しいタスクを作成してみましょう'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* タスクフォームモーダル */}
      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}
