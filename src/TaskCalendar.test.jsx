import { render, screen, cleanup } from '@testing-library/react'
import TaskCalendar from './TaskCalendar'
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2020-05-01'))
})

afterAll(() => {
  vi.useRealTimers()
})

afterEach(() => {
  cleanup()
})

describe('TaskCalendar', () => {
  it('shows task on its due date', () => {
    const tasks = [{ id: '1', text: 'Pay bills', due_date: '2020-05-20' }]
    render(<TaskCalendar tasks={tasks} />)
    expect(screen.getByText('Pay bills')).toBeInTheDocument()
  })
})

