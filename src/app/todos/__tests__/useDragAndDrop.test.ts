import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from '../hooks/useDragAndDrop'
import { Todo } from '../types'

describe('useDragAndDrop', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Todo 1',
      description: null,
      status: 'NOT_STARTED',
      dueDate: null,
      createdAt: new Date(),
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
      dueDate: new Date('2024-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      creatorId: 'user1',
      assigneeId: null
    }
  ]

  const mockUpdateHandlers = {
    onStatusChange: jest.fn(),
    onProjectChange: jest.fn(),
    onDueDateChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets activeId on drag start', () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'status', mockUpdateHandlers)
    )

    expect(result.current.activeId).toBeNull()

    act(() => {
      result.current.handleDragStart({
        active: { id: '1' }
      } as any)
    })

    expect(result.current.activeId).toBe('1')
  })

  it('clears activeId on drag end', () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'status', mockUpdateHandlers)
    )

    act(() => {
      result.current.handleDragStart({
        active: { id: '1' }
      } as any)
    })

    expect(result.current.activeId).toBe('1')

    act(() => {
      result.current.handleDragEnd({
        active: { id: '1' },
        over: null
      } as any)
    })

    expect(result.current.activeId).toBeNull()
  })

  it('calls onStatusChange when dropping in status group', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'status', mockUpdateHandlers)
    )

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '1' },
        over: {
          id: 'drop-zone',
          data: {
            current: {
              groupId: 'IN_PROGRESS'
            }
          }
        }
      } as any)
    })

    expect(mockUpdateHandlers.onStatusChange).toHaveBeenCalledWith('1', 'IN_PROGRESS')
    expect(mockUpdateHandlers.onProjectChange).not.toHaveBeenCalled()
    expect(mockUpdateHandlers.onDueDateChange).not.toHaveBeenCalled()
  })

  it('calls onProjectChange when dropping in project group', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'project', mockUpdateHandlers)
    )

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '2' },
        over: {
          id: 'drop-zone',
          data: {
            current: {
              groupId: 'project2'
            }
          }
        }
      } as any)
    })

    expect(mockUpdateHandlers.onProjectChange).toHaveBeenCalledWith('2', 'project2')
    expect(mockUpdateHandlers.onStatusChange).not.toHaveBeenCalled()
  })

  it('handles no-project group correctly', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'project', mockUpdateHandlers)
    )

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '1' },
        over: {
          id: 'drop-zone',
          data: {
            current: {
              groupId: 'no-project'
            }
          }
        }
      } as any)
    })

    expect(mockUpdateHandlers.onProjectChange).toHaveBeenCalledWith('1', null)
  })

  it('calls onDueDateChange when dropping in due date group', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'dueDate', mockUpdateHandlers)
    )

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '1' },
        over: {
          id: 'drop-zone',
          data: {
            current: {
              groupId: 'today'
            }
          }
        }
      } as any)
    })

    expect(mockUpdateHandlers.onDueDateChange).toHaveBeenCalled()
    const call = mockUpdateHandlers.onDueDateChange.mock.calls[0]
    expect(call[0]).toBe('1')
    expect(call[1]).toBeInstanceOf(Date)
  })

  it('does not update when groupBy is createdAt', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'createdAt', mockUpdateHandlers)
    )

    // Mock console.warn to verify it's called
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '1' },
        over: {
          id: 'drop-zone',
          data: {
            current: {
              groupId: 'created-today'
            }
          }
        }
      } as any)
    })

    expect(warnSpy).toHaveBeenCalledWith('Cannot change created date via drag and drop')
    expect(mockUpdateHandlers.onStatusChange).not.toHaveBeenCalled()
    expect(mockUpdateHandlers.onProjectChange).not.toHaveBeenCalled()
    expect(mockUpdateHandlers.onDueDateChange).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('does nothing when dropped outside a valid group', async () => {
    const { result } = renderHook(() => 
      useDragAndDrop(mockTodos, 'status', mockUpdateHandlers)
    )

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: '1' },
        over: {
          id: 'some-element',
          data: {
            current: {}
          }
        }
      } as any)
    })

    expect(mockUpdateHandlers.onStatusChange).not.toHaveBeenCalled()
    expect(mockUpdateHandlers.onProjectChange).not.toHaveBeenCalled()
    expect(mockUpdateHandlers.onDueDateChange).not.toHaveBeenCalled()
  })
})