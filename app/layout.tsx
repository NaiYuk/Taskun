import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'タスク管理アプリ たすくん。',
  description: 'シンプルで使いやすいタスク管理アプリケーションです。SlackやGoogleカレンダーと連携し、効率的にタスクを管理できます。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
