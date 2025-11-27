import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// タスク作成API
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

// タスク一覧取得API（検索・フィルタリング対応）
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''

    // let query = supabase
    //   .from('tasks')
    //   .select('*', { count: 'exact' })
    //   .eq('user_id', user.id)
    //   .order('created_at', { ascending: false })

    const createFilteredQuery = (statusOverride?: string, countOnly = false) => {
      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: countOnly })
        .eq('user_id', user.id)

      // LIKE検索（タイトルまたは説明）
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (statusOverride) {
        query = query.eq('status', statusOverride)
      } else if (status) {
        query = query.eq('status', status)
      }

      // 優先度フィルター
      if (priority) {
        query = query.eq('priority', priority)
      }

      return query
    }

    // ページング対応（オフセットとリミット(9)）
    const page = Number(searchParams.get('page') || 1)
    const limit = 9;
    const offset = (page - 1) * limit

    const { data: tasks, error, count } = await createFilteredQuery()
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const total = count || 0
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
    const [todoResult, inProgressResult, doneResult] = await Promise.all([
      createFilteredQuery('todo', true),
      createFilteredQuery('in_progress', true),
      createFilteredQuery('done', true),
    ])

    const countError = todoResult.error || inProgressResult.error || doneResult.error
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 })
    }

    return NextResponse.json({
      tasks,
      pagination: ({
        page,
        perPage: limit,
        total,
        totalPages,
      }),
      statusCounts: {
        total,
        todo: todoResult.count ?? 0,
        in_progress: inProgressResult.count ?? 0,
        done: doneResult.count ?? 0,
      },
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
