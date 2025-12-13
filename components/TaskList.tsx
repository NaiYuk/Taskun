"use client";

import { createClient } from "@/lib/supabase/client";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Task, TaskFormData, TaskStatus } from '@/types/task';
import { generateGoogleCalendarUrl } from "@/lib/google/calendar-url";
import { Loader2, LucideSortAsc, LucideSortDesc, Plus } from "lucide-react";
import SearchBar from "./SearchBar";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";
import type { DueFilter } from "@/components/SearchBar";

type SortItem = 'title' | 'priority' | 'due_date' | 'created_at'
type ColumnSortState = Record<TaskStatus, { key: SortItem; order: 'asc' | 'desc' }>;
export function TaskList({
  userEmail,
  onStatsChange,
  onTasksChange,
  slackWebhookUrl,
}: {
  userEmail: string
  onTasksChange?: (tasks: Task[]) => void
  onStatsChange?: (stats: { total: number; todo: number; in_progress: number; done: number }) => void
  slackWebhookUrl?: string
}) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [fetchedTasks, setFetchedTasks] = useState<Task[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [sortItem, setSortItem] = useState<SortItem>('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [filters, setFilters] = useState<{ search: string; statuses: TaskStatus[]; dueFilters: DueFilter[] }>({ search: '', statuses: [], dueFilters: [] })
    const currentFiltersRef = useRef(filters)
    const [columnSorts, setColumnSorts] = useState<ColumnSortState>({
      todo: { key: 'created_at', order: 'desc' },
      in_progress: { key: 'created_at', order: 'desc' },
      done: { key: 'created_at', order: 'desc' },
    })
    const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const [activeVerticalSlides, setActiveVerticalSlides] = useState<Record<string, number>>({
      todo: 0,
      in_progress: 0,
      done: 0,
    })
    const activeRequest = useRef<AbortController | null>(null)
    const reminderTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    const supabase = createClient()

    const hasActiveFilters = Boolean(filters.search || filters.statuses.length)

    /**
     * タスク一覧またはステータス数の変更を親コンポーネントに通知する
     * @param {Task[]} list
     * @returns {void}
     */
    const notifyTasksChange = useCallback((list: Task[]) => {
      onTasksChange?.(list)
    }, [onTasksChange])

    /**
     * タスクステータス数の変更を親コンポーネントに通知する
     * @param {Object} stats
     * @returns {void}
     */
    const notifyStatsChange = useCallback((stats?: { total: number; todo: number; in_progress: number; done: number }) => {
      if (!stats) return
      onStatsChange?.(stats)
    }, [onStatsChange])

    /**
     * タスク一覧をソートする
     * @param {Task[]} list
     * @param {SortItem} key
     * @param {'asc' | 'desc'} order
     * @returns {Task[]}
     */
    const applySort = useCallback((list: Task[], key: SortItem, order: 'asc' | 'desc') => {
      return [...list].sort((a, b) => {
        let diff = 0

        switch (key) {
          case 'title':
            diff = a.title.localeCompare(b.title)
            break
          case 'priority': {
            const priorityValue = { high: 3, medium: 2, low: 1 }
            diff = priorityValue[a.priority] - priorityValue[b.priority]
            break
          }
          case 'due_date': {
            if (!a.due_date && !b.due_date) {
              diff = 0
            } else if (!a.due_date) {
              diff = 1
            } else if (!b.due_date) {
              diff = -1
            } else {
              diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            }
            break
          }
          case 'created_at':
          default:
            diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        return order === 'asc' ? diff : -diff
      })
    }, [])

    /**
     * タスク一覧をサーバーから取得する
     * @param {Object} filtersToUse
     * @returns {Promise<void>}
     */
    const loadTasks = useCallback(async () => {
      setLoading(true)

      // 前回のリクエストを中止
      activeRequest.current?.abort()
      const controller = new AbortController()
      activeRequest.current = controller

      try {
        const params = new URLSearchParams()
        const filtersToUse = currentFiltersRef.current
        if (filtersToUse.search) params.set('search', filtersToUse.search)
        if (filtersToUse.statuses.length) params.set('statuses', filtersToUse.statuses.join(','))
        if (filtersToUse.dueFilters.length) params.set('dueFilters', filtersToUse.dueFilters.join(','))

        const res = await fetch(`/api/tasks?${params.toString()}`)
        const data = await res.json()

        notifyStatsChange(data?.statusCounts)
        setFetchedTasks(data.tasks)
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('タスク取得エラー:', error)
        }
      } finally {
        setLoading(false)
      }
    }, [notifyStatsChange])

    // フィルター条件変更時にタスクを再取得する
    useEffect(() => {
      currentFiltersRef.current = filters
      loadTasks()
    }, [filters, loadTasks])

    // ソート条件変更時やタスク取得時にタスクを整列させる
    useEffect(() => {
      const sortedTasks = applySort(fetchedTasks, sortItem, sortOrder)
      setTasks(sortedTasks)
      notifyTasksChange(sortedTasks)
    }, [applySort, fetchedTasks, notifyTasksChange, sortItem, sortOrder])

    // タスク一覧変更時に親コンポーネントに通知
    useEffect(() => {
      setActiveVerticalSlides({ todo: 0, in_progress: 0, done: 0 })
    }, [tasks])

    // リアルタイム更新の設定
    useEffect(() => {
      const channel = supabase
        .channel("tasks_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          (payload) => {
            console.log("リアルタイム更新:", payload)
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
              loadTasks()
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }, [loadTasks, supabase])

    // コンポーネントアンマウント時にリマインダータイマーをクリア
    useEffect(() => {
      return () => {
        reminderTimers.current.forEach((timer) => clearTimeout(timer))
        reminderTimers.current = []
      }
    }, [])
  /**
   * タスク検索処理（サーバーフィルタリング）
   * @param newFilters 
   * @returns {void}
   */
  const handleSearch = (newFilters: { search: string; statuses: TaskStatus[]; dueFilters: DueFilter[] }) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  /**
   * タスクの日付でソートを切り替える処理
   * @param {}
   * @returns {void}
   */

  /**
   * フィルタ解除処理
   * @param {}
   * @returns {void}
   */
  const handleClear= () => {
    setFilters({ search: '', statuses: [], dueFilters: [] })
  }

  const calculateReminderTime = (data: TaskFormData, taskDueDate?: string | null) => {
    const baseDateString = taskDueDate || data.due_date
    const baseDate = baseDateString ? new Date(baseDateString) : new Date()

    if (Number.isNaN(baseDate.getTime())) return null

    switch (data.reminderTiming) {
      case '10m':
        return new Date(baseDate.getTime() - 10 * 60 * 1000)
      case '1h':
        return new Date(baseDate.getTime() - 60 * 60 * 1000)
      case 'custom':
        if (!data.reminderCustomTime) return null
        const customDate = new Date(data.reminderCustomTime)
        return Number.isNaN(customDate.getTime()) ? null : customDate
      case 'start':
      default:
        return baseDate
    }
  }

  const scheduleReminder = (task: Task, data: TaskFormData) => {
    if (!data.reminderEnabled || !data.slackWebhookUrl) return

    const reminderAt = calculateReminderTime(data, task.due_date)
    if (!reminderAt) return

    const delay = reminderAt.getTime() - Date.now()
    const triggerReminder = async () => {
      try {
        await fetch('/api/slack/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reminder',
            reminder_time: reminderAt.toISOString(),
            task: {
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
            },
            user_email: userEmail,
            webhookUrl: data.slackWebhookUrl,
          }),
        })
      } catch (error) {
        console.error('Slackリマインド送信エラー:', error)
      }
    }

    if (delay <= 0) {
      triggerReminder()
      return
    }

    const timer = setTimeout(triggerReminder, delay)
    reminderTimers.current.push(timer)
  }

  /**
   * カラムごとのソートキー変更処理
   * @param columnKey
   * @param key
   * @returns {void}
   */
  const handleColumnSortKeyChange = (columnKey: TaskStatus, key: SortItem) => {
    setColumnSorts((prev) => ({
      ...prev,
      [columnKey]: { ...prev[columnKey], key },
    }))
  }

  /**
   * カラムごとのソート順変更処理
   * @param columnKey
   * @returns {void}
   */
  const handleColumnSortOrderToggle = (columnKey: TaskStatus) => {
    setColumnSorts((prev) => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        order: prev[columnKey].order === 'asc' ? 'desc' : 'asc',
      },
    }))
  }

  /**
   * カラムごとのタスクソート処理
   * @param list  
   * @param columnKey
   * @return {Task[]}
   */
  const sortColumnTasks = (list: Task[], columnKey: TaskStatus) => {
    const { key, order } = columnSorts[columnKey]
    return applySort(list, key, order)
  }

  /**
   * タスク作成処理
   * @param data 
   * @returns 
   */
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
          webhookUrl: slackWebhookUrl,
        }),
      })

      scheduleReminder(task as Task, data)

      setShowForm(false)
      await loadTasks()
    } catch (error) {
      console.error('タスク作成エラー:', error)
      alert('タスクの作成に失敗しました')
    }
  }

  /**
   * タスク更新処理
   * @param data 
   * @returns 
   */
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
          due_date: data.due_date === "" ? null : data.due_date,
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
            webhookUrl: slackWebhookUrl
          }),
        })
      }
      const updatedTaskFprReminder: Task = {
        ...editingTask,
        ...data,
        due_date: data.due_date === "" ? null : data.due_date || editingTask.due_date,
      }
      scheduleReminder(updatedTaskFprReminder, data)
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, ...data, updated_at: new Date().toISOString() }
            : task
        )
      )
      await loadTasks()
      setEditingTask(undefined)
    } catch (error) {
      console.error('タスク更新エラー:', error)
      alert('タスクの更新に失敗しました: ' + JSON.stringify(error))
    }
  }

  /**
   * タスク更新処理
   * @param id 
   */
  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      await loadTasks()

      if (error) throw error
    } catch (error) {
      console.error('タスク削除エラー:', error)
      alert('タスクの削除に失敗しました')
    }
  }

  /**  
   * タスク編集処理
   * @param task {Task}
   * @return {void}
  */
  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  /**
   * タスク更新処理
   * @param task 
   */
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

  /**
   * タスクフォーム閉じる処理
   * @param {}
   * @returns {void}
   */
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTask(undefined)
  }

  const columns = [
    { key: 'todo', label: '未対応', accent: 'bg-gray-50 border-gray-200' },
    { key: 'in_progress', label: '対応中', accent: 'bg-blue-50 border-blue-200' },
    { key: 'done', label: '完了', accent: 'bg-green-50 border-green-200' },
  ] as const

  /**
   * 縦スクロール時のスライド切り替え処理
   * @param columnKey 
   * @returns {void}
   */
  const handleVerticalScroll = (columnKey: string) => {
    const container = columnRefs.current[columnKey]
    if (!container) return
    const containerHeight = container.clientHeight
    const nextIndex = Math.round(container.scrollTop / Math.max(containerHeight, 1))
    setActiveVerticalSlides((prev) => ({ ...prev, [columnKey]: nextIndex }))
  }
  
  return (
    <>
      <div className="min-h-screen">
        {/* 検索バーと新規作成ボタン */}
        <div className="flex gap-4 items-center mt-8">
          <h1 className="text-xl font-bold text-green-800 h-9">検索・新規作成</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} onClearFilter={handleClear} />
          </div>
        </div>

        {/* タスク一覧ヘッダー */}
        <div className="mt-8 mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-xl font-bold text-green-800 h-6">タスク一覧</h1>
          <button
            onClick={() => {
              setEditingTask(undefined);
              setShowForm(true);
            }}
            className="flex gap-2 px-4 py-2 ml-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="h-5 w-5" />
            新規タスク
          </button>
        </div>

        {/* タスク一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg mb-2">
              {hasActiveFilters ? "検索結果がありません" : "タスクがありません"}
            </div>
            <p className="text-gray-500 text-sm">
              {hasActiveFilters && "新しいタスクを作成してみましょう"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.key)
              const sortedColumnTasks = sortColumnTasks(columnTasks, column.key)

              return (
                <div
                  key={column.key}
                  className={`flex flex-col gap-3 rounded-xl border ${column.accent} p-3`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{column.label}</h3>
                      <span className="text-xs text-gray-500">{columnTasks.length}件</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`${column.key}-sort`}>
                        {column.label}のソートキー
                      </label>
                      <select
                        id={`${column.key}-sort`}
                        value={columnSorts[column.key].key}
                        onChange={(event) => handleColumnSortKeyChange(column.key, event.target.value as SortItem)}
                        className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      >
                        <option value="title">タイトル</option>
                        <option value="priority">優先度</option>
                        <option value="due_date">期限日</option>
                        <option value="created_at">作成日時</option>
                      </select>
                      <button
                        onClick={() => handleColumnSortOrderToggle(column.key)}
                        className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                        title={`${column.label}を${columnSorts[column.key].order === 'desc' ? '昇順' : '降順'}に切り替え`}
                      >
                        {columnSorts[column.key].order === 'desc' ? (
                          <LucideSortDesc className="h-4 w-4 text-gray-600" aria-label="降順でソート" />
                        ) : (
                          <LucideSortAsc className="h-4 w-4 text-gray-600" aria-label="昇順でソート" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* タスクカード群 */}
                  <div
                    ref={(el) => {
                      columnRefs.current[column.key] = el
                    }}
                    onScroll={() => handleVerticalScroll(column.key)}
                    className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-2"
                  >
                    {sortedColumnTasks.map((task) => (
                      <div key={task.id}>
                        <TaskCard
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onNotify={handleAddGoogleCalendar}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* タスクフォームモーダル */}
        {showForm && (
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
            onClose={handleCloseForm}
            defaultSlackWebhookUrl={slackWebhookUrl}
          />
        )}
      </div>
    </>
  );
}

