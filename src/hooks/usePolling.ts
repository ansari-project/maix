import { useEffect, useRef } from 'react'

/**
 * Simple polling hook that calls a function at regular intervals
 * @param callback - Function to call at each interval
 * @param interval - Polling interval in milliseconds (default: 5000ms = 5 seconds)
 * @param enabled - Whether polling is enabled (default: true)
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number = 5000,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback)
  
  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  useEffect(() => {
    if (!enabled) return
    
    // Call immediately on mount if enabled
    savedCallback.current()
    
    // Set up interval
    const intervalId = setInterval(() => {
      savedCallback.current()
    }, interval)
    
    // Cleanup
    return () => clearInterval(intervalId)
  }, [interval, enabled])
}