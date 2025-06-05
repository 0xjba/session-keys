export interface EIP1193Provider {
    request(args: { method: string; params?: any[] }): Promise<any>
    on?(event: string, listener: (...args: any[]) => void): void
    removeListener?(event: string, listener: (...args: any[]) => void): void
  }
  
  export interface TransactionParams {
    to: string
    data: string
    value?: string
    nonce?: number
    gasLimit?: number
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
  }
  
  export interface SessionKeyState {
    sessionKey: string | null
    isActive: boolean
    balance: {
      eth: number
      estimatedTransactions: number
    } | null
    isLoading: boolean
    error: Error | null
  }
  
  export type StateSubscriber = (state: SessionKeyState) => void