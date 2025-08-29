import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { useTranslation } from 'react-i18next'
import DatePicker from './DatePicker'


function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem('tasks')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [query, setQuery] = useState('')
  const dueInputRef = useRef(null)
  const tasksRef = useRef(tasks)
  const { t, i18n } = useTranslation()
  const MAX_RETRIES = 3
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

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'en' ? 'ru' : 'en')
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      setTasks(prev => {
        const pending = prev.filter(t => t.pending)
        pending.forEach(t => syncTask(t))
        const remote = (data || []).filter(t => !pending.some(p => p.id === t.id))
        return [...pending, ...remote]
      })
    }
    load()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        payload => {
          setTasks(prev => {
            const pendingIds = prev.filter(t => t.pending).map(t => t.id)
            const id = payload.new?.id || payload.old?.id
            if (pendingIds.includes(id)) return prev
            switch (payload.eventType) {
              case 'INSERT':
                return [payload.new, ...prev.filter(t => t.id !== id)]
              case 'UPDATE':
                return prev.map(t => (t.id === id ? payload.new : t))
              case 'DELETE':
                return prev.filter(t => t.id !== id)
              default:
                return prev
            }
          })
        }
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    function handleOnline() {
      tasksRef.current.filter(t => t.pending).forEach(syncTask)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
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
      list = list.filter(
        t =>
          t.text.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [tasks, selectedTag, query])

  function syncTask(task, attempt = task.attempts || 0) {
    if (!navigator.onLine) return
    const {
      action,
      pending: _pending,
      attempts: _attempts,
      error: _error,
      ...dbTask
    } = task
    let request
    if (action === 'insert') {
      request = supabase.from('tasks').insert([dbTask]).select().single()
    } else if (action === 'update') {
      const { id, created_at, ...fields } = dbTask
      request = supabase
        .from('tasks')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
    } else {
      return
    }
    request
      .then(({ data, error: err }) => {
        if (err || !data) {
          const nextAttempt = attempt + 1
          setTasks(prev =>
            prev.map(t =>
              t.id === task.id
                ? { ...t, attempts: nextAttempt, error: nextAttempt >= MAX_RETRIES }
                : t
            )
          )
          if (nextAttempt < MAX_RETRIES) {
            setTimeout(() => syncTask(task, nextAttempt), 5000)
          }
        } else {
          setTasks(prev =>
            prev.map(t => (t.id === task.id ? { ...data, pending: false } : t))
          )
        }
      })
      .catch(() => {
        const nextAttempt = attempt + 1
        setTasks(prev =>
          prev.map(t =>
            t.id === task.id
              ? { ...t, attempts: nextAttempt, error: nextAttempt >= MAX_RETRIES }
              : t
          )
        )
        if (nextAttempt < MAX_RETRIES) {
          setTimeout(() => syncTask(task, nextAttempt), 5000)
        }
      })
  }

  function onAddTask(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const tags = tagInput
      .split(',')
      .map(t => t.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean)
    const trimmedDesc = description.trim()
    const newTask = {
      id: uid(),
      text: trimmed,
      description: trimmedDesc || null,
      done: false,
      tags,
      due_date: dueDate || null,
      pending: true,
      attempts: 0,
      action: 'insert',
    }
    setTasks(prev => [newTask, ...prev])
    syncTask(newTask)
    setText('')
    setTagInput('')
    setDescription('')
    setDueDate('')
  }

  function toggleDone(id) {
    let updated
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (!task) return prev
      updated = {
        ...task,
        done: !task.done,
        pending: true,
        action: task.pending ? task.action : 'update',
        attempts: task.pending ? task.attempts : 0,
        error: false,
      }
      return prev.map(t => (t.id === id ? updated : t))
    })
    if (updated) {
      syncTask(updated)
    }
  }

  async function clearCompleted() {
    const completedIds = tasks.filter(t => t.done).map(t => t.id)
    if (completedIds.length === 0) return
    await supabase.from('tasks').delete().in('id', completedIds)
    setTasks(prev => prev.filter(t => !t.done))
  }

  const hasPending = tasks.some(t => t.pending)

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('tagline')}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t(hasPending ? 'notSynced' : 'synced')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleLanguage}
                className="btn btn-outline rounded-full w-9 h-9 flex items-center justify-center"
                aria-label={t('toggleLanguage')}
              >
                {i18n.language === 'en' ? 'RU' : 'EN'}
              </button>
              <button
                onClick={toggleTheme}
                className="btn btn-outline rounded-full w-9 h-9 flex items-center justify-center"
                aria-label={t('toggleTheme')}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Add Task */}
        <section className="card p-4 sm:p-6">
          <form onSubmit={onAddTask} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label htmlFor="task" className="text-sm font-medium">{t('newTask')}</label>
                <input id="task" className="input" placeholder={t('taskPlaceholder')} value={text} onChange={e => setText(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">{t('description')}</label>
                <textarea
                  id="description"
                  className="input"
                  placeholder={t('descriptionPlaceholder')}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="tags" className="text-sm font-medium">{t('tags')}</label>
                <input id="tags" className="input" placeholder={t('tagsPlaceholder')} value={tagInput} onChange={e => setTagInput(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label htmlFor="due" className="text-sm font-medium">Due date</label>
                <DatePicker id="due" value={dueDate} onChange={setDueDate} />
              </div>
            </div>
            <div className="flex sm:justify-end">
              <button type="submit" className="btn btn-primary w-full sm:w-auto">{t('addTask')}</button>
            </div>
          </form>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-2">
          <button className={`chip ${selectedTag === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : ''}`} onClick={() => setSelectedTag('all')}>{t('all')}</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setSelectedTag(tag)} className={`chip ${selectedTag === tag ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : ''}`}>#{tag}</button>
          ))}
          <div className="ml-auto w-full sm:w-auto">
            <input className="input" placeholder={t('searchPlaceholder')} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </section>

        {/* List */}
        <section className="space-y-2">
            {filtered.length === 0 && (
              <div className="card p-6 text-sm text-gray-500 dark:text-gray-400">{t('noTasks')}</div>
            )}
          {filtered.map(task => (
            <article key={task.id} className="card p-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task.id)}
                disabled={task.error}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm sm:text-base ${task.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{task.text}</p>
                  <div className="flex items-center gap-2">
                    {task.due_date && (
                      <span className="text-xs text-gray-500">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {task.description && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{task.description}</p>
                )}
                {task.error && (
                  <p className="mt-1 text-xs text-red-500">{t('syncError')}</p>
                )}
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
            {t('pendingCompleted', {
              pending: tasks.filter(t => !t.done).length,
              completed: tasks.filter(t => t.done).length,
            })}
          </p>
          <button className="btn btn-outline" onClick={clearCompleted} disabled={!tasks.some(t => t.done)}>
            {t('clearCompleted')}
          </button>
        </section>
      </main>
    </div>
  )
}

