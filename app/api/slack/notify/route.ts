import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Slack通知処理
 * @param request 
 * @returns 
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, task, user_email, webhookUrl: customWebhookUrl, reminder_time } = body
    const webhookUrl = customWebhookUrl || process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      console.error('Slack Webhook URLが設定されていません')
      return NextResponse.json(
        { error: 'Slack Webhook URLが設定されていません' },
        { status: 500 }
      )
    }

    const isReminder = action === 'reminder'
    const actionText = isReminder
      ? 'リマインダーです'
      : action === 'created'
        ? '作成されました'
        : '更新されました'
    const emoji = isReminder ? '⏰' : action === 'created' ? '✨' : '🔄'

    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    }

    const statusText = {
      todo: '未対応',
      in_progress: '対応中',
      done: '完了',
    }

    const slackMessage = {
      text: `${emoji} タスクが${actionText}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} タスクが${actionText}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*タスク:*\n${task.title}`,
            },
            {
              type: 'mrkdwn',
              text: `*作成者:*\n${user_email}`,
            },
            {
              type: 'mrkdwn',
              text: `*ステータス:*\n${statusText[task.status as keyof typeof statusText]}`,
            },
            {
              type: 'mrkdwn',
              text: `*優先度:*\n${priorityEmoji[task.priority as keyof typeof priorityEmoji]} ${task.priority}`,
            },
          ],
        },
      ],
    }

    if (isReminder && reminder_time) {
      slackMessage.blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `リマインド時刻: ${new Date(reminder_time).toLocaleString('ja-JP')}`,
          },
        ],
      } as any)
    }

    if (task.description) {
      slackMessage.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*説明:*\n${task.description}`,
        },
      } as any)
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Slack通知エラー:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
