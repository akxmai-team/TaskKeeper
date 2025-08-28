import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [text, setText] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light')
      )
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    root.style.colorScheme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      setTasks(data ?? [])
    }
    load()
  }, [])

  const allTags = useMemo(() => {
    const set = new Set()
    tasks.forEach(t => t.tags?.forEach(tag => set.add(tag)))
    return Array.from(set).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks
    if (selectedTag !== 'all') {
      list = list.filter(t => t.tags?.includes(selectedTag))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(t => t.text.toLowerCase().includes(q))
    }
    return list
  }, [tasks, selectedTag, query])

  async function onAddTask(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const tags = tagInput
      .split(',')
      .map(t => t.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean)
    const newTask = { id: uid(), text: trimmed, done: false, tags }
    const { data } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single()
    if (data) {
      setTasks(prev => [data, ...prev])
    }
    setText('')
    setTagInput('')
  }

  async function toggleDone(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const { data } = await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setTasks(prev => prev.map(t => (t.id === id ? data : t)))
    }
  }

  async function clearCompleted() {
    const completedIds = tasks.filter(t => t.done).map(t => t.id)
    if (completedIds.length === 0) return
    await supabase.from('tasks').delete().in('id', completedIds)
    setTasks(prev => prev.filter(t => !t.done))
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">TaskKeeper</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track tasks, mark them done, and organize with tags.</p>
          </div>
          <button
            onClick={toggleTheme}
            className="btn btn-outline rounded-full w-9 h-9 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Add Task */}
        <section className="card p-4 sm:p-6">
          <form onSubmit={onAddTask} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label htmlFor="task" className="text-sm font-medium">New task</label>
                <input id="task" className="input" placeholder="What do you need to do?" value={text} onChange={e => setText(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label htmlFor="tags" className="text-sm font-medium">Tags</label>
                <input id="tags" className="input" placeholder="e.g. work, personal, urgent" value={tagInput} onChange={e => setTagInput(e.target.value)} />
              </div>
            </div>
            <div className="flex sm:justify-end">
              <button type="submit" className="btn btn-primary w-full sm:w-auto">Add Task</button>
            </div>
          </form>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-2">
          <button className={`chip ${selectedTag === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : ''}`} onClick={() => setSelectedTag('all')}>All</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag)} className={`chip ${selectedTag === tag ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : ''}`}>#{tag}</button>
          ))}
          <div className="ml-auto w-full sm:w-auto">
            <input className="input" placeholder="Search tasks..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </section>

        {/* List */}
        <section className="space-y-2">
          {filtered.length === 0 && (
            <div className="card p-6 text-sm text-gray-500 dark:text-gray-400">No tasks yet. Add your first one above.</div>
          )}
          {filtered.map(task => (
            <article key={task.id} className="card p-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm sm:text-base ${task.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{task.text}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.tags?.map(tag => (
                    <span key={tag} className="chip">#{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Footer actions */}
        <section className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tasks.filter(t => !t.done).length} pending · {tasks.filter(t => t.done).length} completed
          </p>
          <button className="btn btn-outline" onClick={clearCompleted} disabled={!tasks.some(t => t.done)}>
            Clear completed
          </button>
        </section>
      </main>
    </div>
  )
}

