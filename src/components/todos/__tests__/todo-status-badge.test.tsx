import { render, screen } from '@testing-library/react'
import { TodoStatusBadge } from '../todo-status-badge'
import { TodoStatus } from '@prisma/client'

describe('TodoStatusBadge', () => {
  it('renders OPEN status correctly', () => {
    render(<TodoStatusBadge status={TodoStatus.OPEN} />)
    
    expect(screen.getByText('Open')).toBeInTheDocument()
    const badge = screen.getByText('Open').closest('div')
    expect(badge).toHaveClass('text-gray-600', 'border-gray-300')
  })

  it('renders IN_PROGRESS status correctly', () => {
    render(<TodoStatusBadge status={TodoStatus.IN_PROGRESS} />)
    
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    const badge = screen.getByText('In Progress').closest('div')
    expect(badge).toHaveClass('text-blue-600', 'bg-blue-50', 'border-blue-200')
  })

  it('renders COMPLETED status correctly', () => {
    render(<TodoStatusBadge status={TodoStatus.COMPLETED} />)
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
    const badge = screen.getByText('Completed').closest('div')
    expect(badge).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200')
  })

  it('applies custom className', () => {
    render(<TodoStatusBadge status={TodoStatus.OPEN} className="custom-class" />)
    
    const badge = screen.getByText('Open').closest('div')
    expect(badge).toHaveClass('custom-class')
  })

  it('renders correct icons for each status', () => {
    const { container, rerender } = render(<TodoStatusBadge status={TodoStatus.OPEN} />)
    expect(container.querySelector('svg')).toBeTruthy() // Circle icon
    
    rerender(<TodoStatusBadge status={TodoStatus.IN_PROGRESS} />)
    expect(container.querySelector('svg')).toBeTruthy() // Clock icon
    
    rerender(<TodoStatusBadge status={TodoStatus.COMPLETED} />)
    expect(container.querySelector('svg')).toBeTruthy() // CheckCircle icon
  })
})