import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  const mockCallbacks = {
    onSearch: jest.fn(),
    onNewTodo: jest.fn(),
    onToggleDetails: jest.fn(),
    onNavigateUp: jest.fn(),
    onNavigateDown: jest.fn(),
    onDelete: jest.fn(),
    onToggleComplete: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls onSearch when / is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: '/' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onSearch).toHaveBeenCalled()
  })

  it('calls onNewTodo when Ctrl+N is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNewTodo).toHaveBeenCalled()
  })

  it('calls onNewTodo when Cmd+N is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'n', metaKey: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNewTodo).toHaveBeenCalled()
  })

  it('calls onToggleDetails when D is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'd' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onToggleDetails).toHaveBeenCalled()
  })

  it('calls onNavigateUp when ArrowUp is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNavigateUp).toHaveBeenCalled()
  })

  it('calls onNavigateUp when K is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'k' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNavigateUp).toHaveBeenCalled()
  })

  it('calls onNavigateDown when ArrowDown is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNavigateDown).toHaveBeenCalled()
  })

  it('calls onNavigateDown when J is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'j' })
    window.dispatchEvent(event)

    expect(mockCallbacks.onNavigateDown).toHaveBeenCalled()
  })

  it('calls onDelete when Ctrl+Delete is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'Delete', ctrlKey: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onDelete).toHaveBeenCalled()
  })

  it('calls onToggleComplete when Ctrl+Enter is pressed', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onToggleComplete).toHaveBeenCalled()
  })

  it('does not trigger shortcuts when typing in input', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', { key: 'd', bubbles: true })
    Object.defineProperty(event, 'target', { value: input, enumerable: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onToggleDetails).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('does not trigger shortcuts when typing in textarea', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    const event = new KeyboardEvent('keydown', { key: 'd', bubbles: true })
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true })
    window.dispatchEvent(event)

    expect(mockCallbacks.onToggleDetails).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  it('allows Escape key in inputs to blur', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const blurSpy = jest.spyOn(input, 'blur')

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    Object.defineProperty(event, 'target', { value: input, enumerable: true })
    window.dispatchEvent(event)

    expect(blurSpy).toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('shows help when ? is pressed', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation()
    renderHook(() => useKeyboardShortcuts(mockCallbacks))

    const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true })
    window.dispatchEvent(event)

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Keyboard Shortcuts'))

    alertSpy.mockRestore()
  })

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderHook(() => useKeyboardShortcuts(mockCallbacks))
    
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})