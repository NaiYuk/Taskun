'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Pause, Search, X } from 'lucide-react'
import { TaskStatus } from '@/types/task'

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: ((event: any) => void) | null
  start: () => void
  stop: () => void
}

type DueFilter = 'overdue' | 'due_soon'

interface SearchBarProps {
  onSearch: (filters: { search: string; statuses: TaskStatus[]; dueFilters: DueFilter[] }) => void
  onClearFilter: () => void
}

export default function SearchBar({ onSearch, onClearFilter }: SearchBarProps) {
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [dueFilters, setDueFilters] = useState<DueFilter[]>([])
  const [isListening, setIsListening] = useState(false)
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // 音声認識の初期化
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ja-JP'
      recognition.interimResults = false
      recognition.continuous = false

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setSearch((prev) => (prev ? `${prev} ${transcript}` : transcript))
      }

      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)

      recognitionRef.current = recognition
    }
  }, [])

  /**
   * フィルタのリセット
   * @return {void}
   */
  const clearFilters = () => {
    setSearch('')
    setStatuses([])
    setDueFilters([])
    setHasAppliedFilters(false)
    onClearFilter()
  }

  /**
   * 検索実行
   * @return {void}
   */
  const handleSearch = () => {
    onSearch({ search, statuses, dueFilters })
    setHasAppliedFilters(Boolean(search || statuses.length || dueFilters.length))
  }

  /**
   * ステータスフィルタの切り替え
   * @param status 
   */
  const toggleStatus = (status: TaskStatus) => {
      setStatuses((prev) =>
        prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  /**
   * 期日フィルタの切り替え
   * @param filter 
   */
  const toggleDueFilter = (filter: DueFilter) => {
    setDueFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    )
  }

  /**
   * 音声入力の開始
   * @returns 
   */
  const startVoiceInput = () => {
    if (!recognitionRef.current) return
    setIsListening(true)
    recognitionRef.current.start()
  }

  /**
   * 音声入力の停止
   * @returns 
   */
  const stopVoiceInput = () => {
    if (!recognitionRef.current) return
    setIsListening(false)
    recognitionRef.current.stop()
  }

  return (
  <div className="space-y-4 bg-white bg-opacity-30 p-4 rounded-lg shadow-md border border-gray-200">

      {/* 入力エリア */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>

          <input
            type="text"
            placeholder="タスクを検索（タイトル・説明）"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
          />

          {/* 音声ボタン */}
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            disabled={!recognitionRef.current}
            className={`absolute inset-y-0 right-0 px-3 flex items-center justify-center
              text-gray-500 hover:text-green-600 transition-colors
              ${!recognitionRef.current ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isListening
              ? <Pause className="h-5 w-5 text-red-600" />
              : <Mic className="h-5 w-5 text-green-600" />
            }
          </button>
        </div>

        {hasAppliedFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200
                       transition-colors flex items-center gap-2"
          >
            <X className="h-5 w-5" />リセット
          </button>
        )}
      </div>

        {/* ステータスフィルタ */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <p className="block text-sm font-medium text-gray-700 mb-2">ステータス</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { key: 'todo', label: '未対応' },
            { key: 'in_progress', label: '対応中' },
            { key: 'done', label: '完了' }
          ] as const).map((option) => (
            <label
              key={option.key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                statuses.includes(option.key as TaskStatus)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={statuses.includes(option.key as TaskStatus)}
                onChange={() => toggleStatus(option.key as TaskStatus)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 期限フィルタ */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <p className="block text-sm font-medium text-gray-700 mb-2">期限日</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            { key: 'overdue', label: '期限切れ' },
            { key: 'due_soon', label: '残り5日以内' },
          ] as const).map((option) => (
            <label
              key={option.key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                dueFilters.includes(option.key)
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={dueFilters.includes(option.key)}
                onChange={() => toggleDueFilter(option.key)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

    {/* 検索ボタン */}
    <div className="flex items-center gap-3">
        <button
          onClick={handleSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch()
          }}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700
                     transition-colors flex items-center gap-2"
        >
          <Search className="h-5 w-5" />
          検索
        </button>

    {hasAppliedFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200
                       transition-colors flex items-center gap-2"
          >
            <X className="h-5 w-5" />リセット
          </button>
        )}
      </div>
    </div>
  )
}
