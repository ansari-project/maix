import { renderHook } from '@testing-library/react'
import { useGroupedTodos } from '../hooks/useGroupedTodos'
import { Todo } from '../types'

describe('useGroupedTodos', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Todo 1',
      description: null,
      status: 'NOT_STARTED',
      dueDate: new Date('2024-12-31'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      projectId: 'project1',
      creatorId: 'user1',
      assigneeId: null,
      project: {
        id: 'project1',
        name: 'Project A'
      }
    },
    {
      id: '2',
      title: 'Todo 2',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: null,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date(),
      projectId: 'project2',
      creatorId: 'user1',
      assigneeId: null,
      project: {
        id: 'project2',
        name: 'Project B'
      }
    },
    {
      id: '3',
      title: 'Todo 3',
      description: null,
      status: 'COMPLETED',
      dueDate: new Date('2024-01-15'),
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date(),
      projectId: null,
      creatorId: 'user1',
      assigneeId: null
    }
  ]

  it('groups todos by status', () => {
    const { result } = renderHook(() => useGroupedTodos(mockTodos, 'status'))
    
    // Should have all 4 status groups even if some are empty
    expect(result.current).toHaveLength(4)
    
    const notStartedGroup = result.current.find(g => g.label === 'Not Started')
    const inProgressGroup = result.current.find(g => g.label === 'In Progress')
    const waitingForGroup = result.current.find(g => g.label === 'Waiting For')
    const completedGroup = result.current.find(g => g.label === 'Completed')
    
    expect(notStartedGroup?.todos).toHaveLength(1)
    expect(inProgressGroup?.todos).toHaveLength(1)
    expect(waitingForGroup?.todos).toHaveLength(0) // Empty group
    expect(completedGroup?.todos).toHaveLength(1)
  })

  it('groups todos by project', () => {
    const { result } = renderHook(() => useGroupedTodos(mockTodos, 'project'))
    
    expect(result.current).toHaveLength(3)
    // Should have 2 project groups plus 'Uncategorized' group
    expect(result.current).toHaveLength(3)
    
    const projectAGroup = result.current.find(g => g.label === 'Project A')
    const projectBGroup = result.current.find(g => g.label === 'Project B')
    const uncategorizedGroup = result.current.find(g => g.label === 'Uncategorized')
    
    expect(projectAGroup?.todos).toHaveLength(1)
    expect(projectBGroup?.todos).toHaveLength(1)
    expect(uncategorizedGroup?.todos).toHaveLength(1)
  })

  it('returns single group when groupBy is none', () => {
    const { result } = renderHook(() => useGroupedTodos(mockTodos, 'none'))
    
    expect(result.current).toHaveLength(1)
    expect(result.current[0].label).toBe('All Todos')
    expect(result.current[0].todos).toHaveLength(3)
  })

  it('groups are sorted by sortOrder', () => {
    const { result } = renderHook(() => useGroupedTodos(mockTodos, 'status'))
    
    // Check that status groups are in the correct order
    expect(result.current[0].sortOrder).toBeLessThan(result.current[1].sortOrder)
    expect(result.current[1].sortOrder).toBeLessThan(result.current[2].sortOrder)
  })

  it('handles empty todos array', () => {
    const { result } = renderHook(() => useGroupedTodos([], 'status'))
    
    // Should still have all 4 status groups, but they'll be empty
    expect(result.current).toHaveLength(4)
    expect(result.current.every(group => group.todos.length === 0)).toBe(true)
  })

  it('recalculates when groupBy changes', () => {
    const { result, rerender } = renderHook(
      ({ todos, groupBy }) => useGroupedTodos(todos, groupBy),
      {
        initialProps: { todos: mockTodos, groupBy: 'status' as const }
      }
    )
    
    expect(result.current[0].label).toBe('Not Started')
    
    rerender({ todos: mockTodos, groupBy: 'project' })
    
    // After changing to project grouping
    const hasProjectGroup = result.current.some(g => g.label.includes('Project'))
    expect(hasProjectGroup).toBe(true)
  })
})