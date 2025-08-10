import { useDroppable } from '@dnd-kit/core'
import { ReactNode } from 'react'

interface DroppableGroupProps {
  id: string
  children: ReactNode
  className?: string
}

export function DroppableGroup({ id, children, className = '' }: DroppableGroupProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      groupId: id
    }
  })
  
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-accent/20' : ''}`}
    >
      {children}
    </div>
  )
}