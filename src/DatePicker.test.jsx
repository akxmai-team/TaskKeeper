import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import DatePicker from './DatePicker'
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

describe('DatePicker', () => {
  it('toggles calendar when input is clicked', () => {
    const handleChange = vi.fn()
    render(<DatePicker id="due" value="" onChange={handleChange} />)
    // initially closed
    expect(screen.queryByLabelText('Previous month')).toBeNull()

    // open calendar
    fireEvent.click(screen.getByRole('textbox'))
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()

    // close calendar
    fireEvent.click(screen.getByRole('textbox'))
    expect(screen.queryByLabelText('Previous month')).toBeNull()
  })

  it('calls onChange and closes when a date is selected', () => {
    const handleChange = vi.fn()
    render(<DatePicker id="due" value="2020-05-15" onChange={handleChange} />)

    fireEvent.click(screen.getByRole('textbox'))
    fireEvent.click(screen.getByText('20'))

    expect(handleChange).toHaveBeenCalledWith('2020-05-20')
    expect(screen.queryByLabelText('Previous month')).toBeNull()
  })
})
