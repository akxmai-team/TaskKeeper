import { useMemo, useState } from 'react'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const start = new Date(firstDay)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(lastDay)
  end.setDate(end.getDate() + (6 - end.getDay()))
  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

export default function TaskCalendar({ tasks }) {
  const [viewDate, setViewDate] = useState(new Date())
  const days = useMemo(() => getCalendarDays(viewDate), [viewDate])

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="p-1 hover:text-indigo-600"
          onClick={() =>
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))
          }
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          className="p-1 hover:text-indigo-600"
          onClick={() =>
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))
          }
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-gray-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map(d => {
          const isCurrent = d.getMonth() === viewDate.getMonth()
          const dayStr = formatDate(d)
          const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dayStr))
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[80px] p-1 rounded border border-gray-200 dark:border-gray-700 ${
                isCurrent
                  ? 'bg-white dark:bg-gray-900'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              }`}
            >
              <div className="text-xs mb-1">{d.getDate()}</div>
              <div className="space-y-0.5">
                {dayTasks.map(task => (
                  <div key={task.id} className="truncate text-xs">
                    {task.text}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

