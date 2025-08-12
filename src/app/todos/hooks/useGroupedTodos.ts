import { useMemo } from 'react'
import { Todo } from '../types'
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, isPast } from 'date-fns'

export type GroupBy = 'status' | 'dueDate' | 'createdAt' | 'project' | 'organization' | 'none'

export interface TodoGroup {
  id: string
  label: string
  todos: Todo[]
  sortOrder: number
}

export function useGroupedTodos(todos: Todo[], groupBy: GroupBy): TodoGroup[] {
  return useMemo(() => {
    if (groupBy === 'none') {
      return [{
        id: 'all',
        label: 'All Todos',
        todos,
        sortOrder: 0
      }]
    }

    const groups = new Map<string, TodoGroup>()

    // Pre-populate groups based on groupBy type to ensure all groups are shown
    switch (groupBy) {
      case 'status':
        // Always show all status groups
        groups.set('NOT_STARTED', { id: 'NOT_STARTED', label: 'Not Started', todos: [], sortOrder: 1 })
        groups.set('IN_PROGRESS', { id: 'IN_PROGRESS', label: 'In Progress', todos: [], sortOrder: 2 })
        groups.set('WAITING_FOR', { id: 'WAITING_FOR', label: 'Waiting For', todos: [], sortOrder: 3 })
        groups.set('COMPLETED', { id: 'COMPLETED', label: 'Completed', todos: [], sortOrder: 4 })
        break

      case 'dueDate':
        // Always show all date groups
        groups.set('overdue', { id: 'overdue', label: 'Overdue', todos: [], sortOrder: 0 })
        groups.set('today', { id: 'today', label: 'Today', todos: [], sortOrder: 1 })
        groups.set('this-week', { id: 'this-week', label: 'This Week', todos: [], sortOrder: 2 })
        groups.set('this-month', { id: 'this-month', label: 'This Month', todos: [], sortOrder: 3 })
        groups.set('beyond', { id: 'beyond', label: 'Beyond', todos: [], sortOrder: 4 })
        groups.set('no-due-date', { id: 'no-due-date', label: 'No Due Date', todos: [], sortOrder: 5 })
        break

      case 'project':
        // Add uncategorized group
        groups.set('no-project', { id: 'no-project', label: 'Uncategorized', todos: [], sortOrder: 999 })
        // Projects will be added as we encounter them
        break
    }

    todos.forEach(todo => {
      let groupKey: string
      let groupLabel: string
      let sortOrder: number

      switch (groupBy) {
        case 'status':
          groupKey = todo.status
          groupLabel = formatStatus(todo.status)
          sortOrder = getStatusOrder(todo.status)
          break

        case 'dueDate':
          const dueDateGroup = getDueDateGroup(todo.dueDate)
          groupKey = dueDateGroup.key
          groupLabel = dueDateGroup.label
          sortOrder = dueDateGroup.sortOrder
          break

        case 'createdAt':
          const createdGroup = getCreatedDateGroup(todo.createdAt)
          groupKey = createdGroup.key
          groupLabel = createdGroup.label
          sortOrder = createdGroup.sortOrder
          break

        case 'project':
          groupKey = todo.projectId || 'no-project'
          groupLabel = todo.project?.name || 'Uncategorized'
          sortOrder = todo.project ? 0 : 999
          break

        case 'organization':
          // For now, we'll group by project's organization (if available)
          // This will need to be expanded when organization data is available
          groupKey = 'default-org'
          groupLabel = 'My Organization'
          sortOrder = 0
          break

        default:
          groupKey = 'unknown'
          groupLabel = 'Unknown'
          sortOrder = 999
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          label: groupLabel,
          todos: [],
          sortOrder
        })
      }

      groups.get(groupKey)!.todos.push(todo)
    })

    // Sort groups by sortOrder, then by label
    return Array.from(groups.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.label.localeCompare(b.label)
    })
  }, [todos, groupBy])
}

function formatStatus(status: string): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'Not Started'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'WAITING_FOR':
      return 'Waiting For'
    case 'COMPLETED':
      return 'Completed'
    default:
      return status.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
  }
}

function getStatusOrder(status: string): number {
  switch (status) {
    case 'NOT_STARTED':
      return 1
    case 'IN_PROGRESS':
      return 2
    case 'WAITING_FOR':
      return 3
    case 'COMPLETED':
      return 4
    default:
      return 999
  }
}

function getDueDateGroup(dueDate: Date | null): { key: string; label: string; sortOrder: number } {
  if (!dueDate) {
    return { key: 'no-due-date', label: 'No Due Date', sortOrder: 5 }
  }

  const date = new Date(dueDate)
  
  if (isPast(date) && !isToday(date)) {
    return { key: 'overdue', label: 'Overdue', sortOrder: 0 }
  }
  if (isToday(date)) {
    return { key: 'today', label: 'Today', sortOrder: 1 }
  }
  if (isTomorrow(date)) {
    // Tomorrow is part of "This Week"
    return { key: 'this-week', label: 'This Week', sortOrder: 2 }
  }
  if (isThisWeek(date)) {
    return { key: 'this-week', label: 'This Week', sortOrder: 2 }
  }
  if (isThisMonth(date)) {
    return { key: 'this-month', label: 'This Month', sortOrder: 3 }
  }
  
  // Everything else is "Beyond"
  return { key: 'beyond', label: 'Beyond', sortOrder: 4 }
}

function getCreatedDateGroup(createdAt: Date): { key: string; label: string; sortOrder: number } {
  const date = new Date(createdAt)
  
  if (isToday(date)) {
    return { key: 'created-today', label: 'Created Today', sortOrder: 0 }
  }
  if (isThisWeek(date)) {
    return { key: 'created-this-week', label: 'Created This Week', sortOrder: 1 }
  }
  if (isThisMonth(date)) {
    return { key: 'created-this-month', label: 'Created This Month', sortOrder: 2 }
  }
  
  // Group by month for older items
  const monthYear = format(date, 'MMMM yyyy')
  return { key: `created-${monthYear}`, label: `Created in ${monthYear}`, sortOrder: 3 }
}