import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Task, TaskStatus } from '@/types/task'

/**
 * タスク作成処理
 * @param request 
 * @returns 
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, priority, due_date } = body

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        due_date: due_date || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Slack通知を送信
    try {
      await fetch(`${request.nextUrl.origin}/api/slack/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'created',
          task: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          },
          user_email: user.email,
        }),
      })
    } catch (slackError) {
      console.error('Slack通知エラー:', slackError)
      // Slack通知が失敗してもタスク作成は成功として扱う
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** タスク一覧取得処理
 * @param request 
 * @returns 
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const statusesParam = searchParams.get('statuses') || ''
    const dueFilterParam = searchParams.get('due_filters') || ''

    const statuses = statusesParam
      .split(',')
      .map(v => v.trim())
      .filter((v): v is TaskStatus => ['todo', 'in_progress', 'done'].includes(v))

    const dueFilters = dueFilterParam
      .split(',')
      .map(v => v.trim())
      .filter(v => ['overdue', 'due_soon'].includes(v))

    const createFilteredQuery = (statusOverride?: TaskStatus, countOnly = false) => {
      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: countOnly })
        .eq('user_id', user.id)

      // LIKE検索（タイトル・説明）
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      // ステータスフィルタ
      if (statusOverride) {
        query = query.eq('status', statusOverride)
      } else if (statuses.length > 0) {
        query = query.in('status', statuses)
      }

      return query
    }

    const { data: rawTasks, error } = await createFilteredQuery()
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const tasks = applyDueDateFilters(rawTasks, dueFilters)

    // -----------------------------
    const statusCounts = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    }

    return NextResponse.json({ tasks, statusCounts }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * 期日フィルタの適用
 * @param tasks 
 * @param dueFilters 
 * @returns 
 */
function applyDueDateFilters(tasks: Task[], dueFilters: string[]) {
  if (dueFilters.length === 0) return tasks

  const today = new Date()
  const fiveDaysLater = new Date()
  fiveDaysLater.setDate(today.getDate() + 5)

  const isOverdue = (d: Date) => d < today
  const isDueSoon = (d: Date) => d >= today && d <= fiveDaysLater

  return tasks.filter(task => {
    if (!task.due_date) return false
    const d = new Date(task.due_date)

    const overdue = dueFilters.includes('overdue')
    const dueSoon = dueFilters.includes('due_soon')

    if (overdue && !dueSoon) return isOverdue(d)
    if (dueSoon && !overdue) return isDueSoon(d)
    if (overdue && dueSoon) return isOverdue(d) || isDueSoon(d)

    return true
  })
}