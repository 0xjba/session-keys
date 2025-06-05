import { useState, useEffect } from 'react'
import type { SessionKeyState } from '../types'
import { getState, subscribeToState } from '../core/state'

/**
 * React hook for subscribing to session key state
 * 
 * @example
 * ```tsx
 * import { useSessionKeyState } from '@tenprotocol/session-keys/react'
 * 
 * function MyComponent() {
 *   const { sessionKey, isActive, balance, isLoading, error } = useSessionKeyState()
 *   
 *   return (
 *     <div>
 *       <p>Session Key: {sessionKey}</p>
 *       <p>Active: {isActive ? 'Yes' : 'No'}</p>
 *       <p>Balance: {balance?.eth} ETH</p>
 *       {isLoading && <p>Loading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export const useSessionKeyState = (): SessionKeyState => {
  const [state, setState] = useState<SessionKeyState>(getState)

  useEffect(() => {
    const unsubscribe = subscribeToState(setState)
    return unsubscribe
  }, [])

  return state
}