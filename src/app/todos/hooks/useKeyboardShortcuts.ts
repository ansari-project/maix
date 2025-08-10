import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onSearch?: () => void
  onNewTodo?: () => void
  onToggleDetails?: () => void
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onDelete?: () => void
  onToggleComplete?: () => void
}

export function useKeyboardShortcuts({
  onSearch,
  onNewTodo,
  onToggleDetails,
  onNavigateUp,
  onNavigateDown,
  onDelete,
  onToggleComplete
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only handle Escape in inputs
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Global shortcuts
      switch (e.key) {
        case '/':
          e.preventDefault()
          onSearch?.()
          break
        
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            onNewTodo?.()
          }
          break
        
        case 'd':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onToggleDetails?.()
          }
          break
        
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          onNavigateUp?.()
          break
        
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          onNavigateDown?.()
          break
        
        case 'Delete':
        case 'Backspace':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onDelete?.()
          }
          break
        
        case 'Enter':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onToggleComplete?.()
          }
          break
        
        case '?':
          if (e.shiftKey) {
            e.preventDefault()
            showShortcutsHelp()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearch, onNewTodo, onToggleDetails, onNavigateUp, onNavigateDown, onDelete, onToggleComplete])
}

function showShortcutsHelp() {
  // This could be improved with a proper modal
  alert(`Keyboard Shortcuts:
  
  / - Search todos
  Ctrl/Cmd + N - New todo
  D - Toggle details panel
  ↑/K - Navigate up
  ↓/J - Navigate down
  Ctrl/Cmd + Enter - Toggle complete
  Ctrl/Cmd + Delete - Delete todo
  ? - Show this help`)
}