"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Task, TaskFormData } from '@/types/task';
import { generateGoogleCalendarUrl } from "@/lib/google/calendar-url";
import { Loader2, LucideSortAsc, LucideSortDesc, Plus } from "lucide-react";
import SearchBar from "./SearchBar";
import Pagination from "./Pagenation";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

type PaginationState = { page: number; perPage: number; total: number; totalPages: number }
export function TaskList({
  page = 1,
  userEmail,
  onChangePage,
  onStatsChange,
  onTasksChange,
}: {
  page?: number
  userEmail: string
  onChangePage: (page: number) => void
  onTasksChange?: (tasks: Task[]) => void
  onStatsChange?: (stats: { total: number; todo: number; in_progress: number; done: number }) => void
}) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
    const [pagination, setPagination] = useState<PaginationState | null>(null)
    const [loading, setLoading] = useState(false)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
    const supabase = createClient()

    const hasActiveFilters = Boolean(filters.search || filters.status || filters.priority)

    const notifyTasksChange = useCallback((list: Task[]) => {
      onTasksChange?.(list)
    }, [onTasksChange])

    const notifyStatsChange = useCallback((stats?: { total: number; todo: number; in_progress: number; done: number }) => {
      if (!stats) return
      onStatsChange?.(stats)
    }, [onStatsChange])

    const applySort = useCallback((list: Task[], order: 'asc' | 'desc') => {
      return [...list].sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return order === 'asc' ? diff : -diff
      })
    }, [])

    const loadTasks = useCallback(async (pageToLoad: number, filtersToUse = filters) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(pageToLoad))
        if (filtersToUse.search) params.set('search', filtersToUse.search)
        if (filtersToUse.status) params.set('status', filtersToUse.status)
        if (filtersToUse.priority) params.set('priority', filtersToUse.priority)

        const res = await fetch(`/api/tasks?${params.toString()}`)
        const data = await res.json()

        const availablePages = data?.pagination?.totalPages ?? 0
        notifyStatsChange(data?.statusCounts)

        if (availablePages === 0) {
          setTasks([])
          notifyTasksChange([])
          setPagination(data.pagination)
          if (pageToLoad !== 1) onChangePage(1)
          return
        }

        if (pageToLoad > availablePages) {
          onChangePage(availablePages)
          return
        }

        const sortedTasks = applySort(data.tasks, sortOrder)
        setTasks(sortedTasks)
        notifyTasksChange(sortedTasks)
        setPagination(data.pagination)
      } finally {
        setLoading(false)
      }
    }, [applySort, filters, notifyTasksChange, sortOrder])

    useEffect(() => {
      loadTasks(page, filters)
    }, [page, filters, loadTasks])

    useEffect(() => {
      setTasks((prev) => applySort(prev, sortOrder))
    }, [sortOrder])

  useEffect(() => {
    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          console.log("リアルタイム更新:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            loadTasks(page, filters)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [page, filters, loadTasks])

  // タスク検索処理（サーバーフィルタリング）
  const handleSearch = (newFilters: { search: string; status: string; priority: string }) => {
    setFilters(newFilters)
    onChangePage(1)
  }

  // タスクの日付でソートを切り替える処理
  const handleChangeSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // フィルタ解除処理
  const handleClear= () => {
    setFilters({ search: '', status: '', priority: '' })
    onChangePage(1)
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
      onChangePage(1)
      await loadTasks(1)
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

      // Slack通知を送信
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetch('/api/slack/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updated',
            task: {
              title: data.title,
              description: data.description,
              status: data.status,
              priority: data.priority,
            },
            user_email: userEmail,
          }),
        })
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, ...data, updated_at: new Date().toISOString() }
            : task
        )
      )
      await loadTasks(page)
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
      await loadTasks(page)

      if (error) throw error
    } catch (error) {
      console.error('タスク削除エラー:', error)
      alert('タスクの削除に失敗しました')
    }
  }

  // タスク編集のためのフォーム表示
  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  // タスク通知処理
  const handleAddGoogleCalendar = async (task: Task) => {
    const url = generateGoogleCalendarUrl({
      title: task.title,
      description: task.description || '',
      start: task.due_date ? new Date(task.due_date) : new Date(),
      end: task.due_date
        ? new Date(new Date(task.due_date).getTime() + 60 * 60 * 1000)
        : new Date(new Date().getTime() + 60 * 60 * 1000),
    })
    
    window.open(url, '_blank')
  }


  // フォームを閉じる
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(undefined)
  }
    return (
      <>
      <div className="min-h-screen">
        {/* 検索バーと新規作成ボタン */}
        <div className="flex gap-4 items-center mt-8">
          <h1 className="text-xl font-bold text-green-800 h-9">検索・新規作成</h1>
          <p className="text-sm text-gray-500 pb-2">キーワード検索・条件検索</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} onClearFilter={handleClear} />
          </div>
          <button
            onClick={() => {
              setEditingTask(undefined);
              setShowForm(true);
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
              {sortOrder === 'desc' ? (
                <LucideSortDesc className="h-6 w-6 border-rounded text-gray-600 hover:text-green-800" aria-label="日付降順でソート" />
              ) : (
                <LucideSortAsc className="h-6 w-6 border-rounded text-gray-600 hover:text-green-800" aria-label="日付昇順でソート" />              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 pb-2">(タスクの編集・削除もこちらで行います)</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg mb-2">
              {hasActiveFilters ? '検索結果がありません' : 'タスクがありません'}
            </div>
            <p className="text-gray-500 text-sm">
              {hasActiveFilters && '新しいタスクを作成してみましょう'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onNotify={handleAddGoogleCalendar}
              />
            ))}
          </div>
        )}

        {pagination && (
          <Pagination
            page={page ?? 1}
            totalPages={pagination.totalPages}
            onChange={onChangePage}
            />
        )}

        {/* タスクフォームモーダル */}
        {showForm && (
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onClose={handleCloseForm}
          />
        )}
        </div>
        </>
    )
}

