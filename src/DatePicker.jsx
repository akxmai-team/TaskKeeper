import { useEffect, useMemo, useRef, useState } from 'react'

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

export default function DatePicker({ id, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()))
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value))
    }
  }, [value])

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate])
  const selected = value ? new Date(value) : null

  return (
    <div className="relative" ref={ref}>
      <input
        id={id}
        readOnly
        className="date-input cursor-pointer"
        placeholder="YYYY-MM-DD"
        value={value}
        onClick={() => setOpen(o => !o)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle date picker"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="p-1 hover:text-indigo-600"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
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
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-gray-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-sm">
            {days.map(d => {
              const isCurrent = d.getMonth() === viewDate.getMonth()
              const isSelected = selected && d.toDateString() === selected.toDateString()
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(formatDate(d))
                    setOpen(false)
                  }}
                  className={`h-8 w-8 mx-auto mb-1 flex items-center justify-center rounded-full ${isSelected ? 'bg-indigo-600 text-white' : isCurrent ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400'}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
