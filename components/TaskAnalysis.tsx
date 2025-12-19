'use client';

import { LucideActivity, LucidePauseCircle, LucideLoader, LucideCheck, LucideMessageCircleWarning, LucideMessageSquareWarning } from 'lucide-react';

interface Task {
  due_date?: string | null;
}

interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
}

export default function TaskAnalysis({ tasks = [], taskStats }: { tasks?: Task[]; taskStats: TaskStats }) {
  // まもなく期限のタスクのカウントを計算
  const duesoonCount = tasks.filter(task => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff >= 0 && daysDiff <= 5;
  }).length;

  // 期限切れのタスクのカウントを計算
  const overdueCount = tasks.filter(task => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    return dueDate < today;
  }).length;

  // タスク進捗度を計算
  const progressRate = taskStats.total === 0 ? 0 : Math.round((taskStats.done / taskStats.total) * 100);

  return (
    <>
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
            <LucidePauseCircle className='h-5 w-5 mb-2 text-gray-600'/>
            未対応
        </div>
        <div className="text-3xl font-bold text-gray-600">{taskStats.todo}</div>
        </div>
        <div className="bg-indigo-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-blue-200">
        <div className="text-sm text-gray-600 mb-1">
            <LucideLoader className='h-5 w-5 mb-2 text-indigo-600'/>
            対応中
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
        {/* まもなく期限 */}
        <div className="bg-red-100 bg-opacity-50 rounded-xl shadow-sm p-5 border border-red-200">
        <div className="text-sm text-gray-600 mb-1">
            <LucideMessageCircleWarning className='h-5 w-5 mb-2 text-red-600'/>
            まもなく期限
        </div>
        <div className="text-3xl font-bold text-gray-900">
            {duesoonCount}
        </div>
        </div>
        <div className="bg-red-200 bg-opacity-70 rounded-xl shadow-sm p-5 border border-red-300">
        <div className="text-sm text-gray-600 mb-1">
            <LucideMessageSquareWarning className='h-5 w-5 mb-2 text-red-700'/>
            期限切れ
        </div>
        <div className="text-3xl font-bold text-gray-900">
            {overdueCount}
        </div>
        </div>  
        <div className="bg-white bg-opacity-50 rounded-xl shadow-sm p-5 border border-gray-200 col-span-2">
        <div className="text-sm text-gray-600 mb-1">
            <LucideActivity className='h-5 w-5 mb-2 text-green-600'/>
            タスク進捗度
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6">
            <div
            className="bg-green-600 h-6 rounded-full text-white text-center font-medium transition-all duration-500"
            style={{
                width: taskStats.total === 0 ? '0%' : `${progressRate}%`
            }}
            >
            {taskStats.total === 0 ? '0%' : `${progressRate}%`}
            </div>
        </div>
        </div>  
    </div>
    </>
  );
}