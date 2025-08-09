import { Badge } from "@/components/ui/badge"
import { TodoStatus } from "@prisma/client"
import { CheckCircle, Clock, Circle, CircleDot, Pause } from "lucide-react"

interface TodoStatusBadgeProps {
  status: TodoStatus
  className?: string
}

export function TodoStatusBadge({ status, className }: TodoStatusBadgeProps) {
  const statusConfig: Record<TodoStatus, {
    label: string
    variant: "outline" | "secondary" | "default" | "destructive"
    icon: typeof Circle
    className: string
  }> = {
    NOT_STARTED: {
      label: "Not Started",
      variant: "outline" as const,
      icon: Circle,
      className: "text-gray-600 border-gray-300"
    },
    OPEN: {
      label: "Open",
      variant: "outline" as const,
      icon: CircleDot,
      className: "text-gray-600 border-gray-300"
    },
    IN_PROGRESS: {
      label: "In Progress",
      variant: "secondary" as const,
      icon: Clock,
      className: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
    },
    WAITING_FOR: {
      label: "Waiting",
      variant: "secondary" as const,
      icon: Pause,
      className: "text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
    },
    COMPLETED: {
      label: "Completed",
      variant: "default" as const,
      icon: CheckCircle,
      className: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
    },
    DONE: {
      label: "Done",
      variant: "default" as const,
      icon: CheckCircle,
      className: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className || ''}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}