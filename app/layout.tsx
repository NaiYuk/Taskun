import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'タスク管理アプリ たすくん。',
  description: 'Next.js + Supabaseで構築したタスク管理アプリケーション',
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
