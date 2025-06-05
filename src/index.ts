// Core functionality
export {
    createSessionKey,
    fundSessionKey,
    activateSessionKey,
    deactivateSessionKey,
    deleteSessionKey,
    cleanupSessionKey
  } from './core/sessionKey'
  
  // Transaction execution
  export { sendTransaction } from './core/transaction'
  
  // State management
  export {
    getState,
    getSessionKey,
    getIsActive,
    getBalance,
    getIsLoading,
    getError,
    subscribeToState
  } from './core/state'
  
  // Types
  export type {
    EIP1193Provider,
    TransactionParams,
    SessionKeyState,
    StateSubscriber
  } from './types'