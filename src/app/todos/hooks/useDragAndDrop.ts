import { useState } from 'react'
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { Todo } from '../types'
import { GroupBy } from './useGroupedTodos'

interface DragAndDropHandlers {
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  activeId: string | null
}

interface UpdateHandlers {
  onStatusChange: (todoId: string, newStatus: string) => Promise<void>
  onProjectChange: (todoId: string, newProjectId: string | null) => Promise<void>
  onDueDateChange: (todoId: string, newDueDate: Date | null) => Promise<void>
}

export function useDragAndDrop(
  todos: Todo[],
  groupBy: GroupBy,
  updateHandlers: UpdateHandlers
): DragAndDropHandlers {
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Add visual feedback during drag over
    // This can be expanded for more complex interactions
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      return
    }

    const draggedTodoId = active.id as string
    
    // Try to get group ID from the droppable area or from another todo in the group
    let targetGroupId: string | undefined
    
    // Check if dropped on a group drop zone
    if (over.data?.current?.groupId) {
      targetGroupId = over.data.current.groupId as string
    } else {
      // If dropped on another todo, find which group it belongs to
      const targetTodoId = over.id as string
      // Find the target todo's group by checking all todos
      // This would need to be passed in or calculated based on current grouping
      return // For now, only support dropping on groups directly
    }

    if (!targetGroupId) {
      return
    }

    // Update the todo based on the group type
    switch (groupBy) {
      case 'status':
        await updateHandlers.onStatusChange(draggedTodoId, targetGroupId)
        break

      case 'project':
        const newProjectId = targetGroupId === 'no-project' ? null : targetGroupId
        await updateHandlers.onProjectChange(draggedTodoId, newProjectId)
        break

      case 'dueDate':
        const newDueDate = parseDueDateFromGroupId(targetGroupId)
        await updateHandlers.onDueDateChange(draggedTodoId, newDueDate)
        break

      case 'createdAt':
        // Created date cannot be changed via drag and drop
        console.warn('Cannot change created date via drag and drop')
        break

      case 'organization':
        // Organization changes would require more complex logic
        console.warn('Organization changes not yet implemented')
        break

      case 'none':
        // No grouping means no group-based updates
        break
    }
  }

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    activeId
  }
}

function parseDueDateFromGroupId(groupId: string): Date | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (groupId) {
    case 'no-due-date':
      return null
    case 'today':
      return today
    case 'tomorrow':
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    case 'this-week':
      // Set to end of this week (Sunday)
      const endOfWeek = new Date(today)
      const daysUntilSunday = 7 - today.getDay()
      endOfWeek.setDate(today.getDate() + daysUntilSunday)
      return endOfWeek
    case 'this-month':
      // Set to end of this month
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return endOfMonth
    case 'overdue':
      // Can't set to "overdue" - set to yesterday as a reasonable default
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    case 'later':
      // Set to next month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      return nextMonth
    default:
      return null
  }
}