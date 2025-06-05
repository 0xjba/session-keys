# @tenprotocol/session-keys

Framework-agnostic session key management for TEN Protocol. Provides seamless transaction execution without wallet popups.

## Features

- 🔑 **Session Key Management** - Create, fund, activate, and manage session keys
- 🚀 **Framework Agnostic** - Works with Ethers, Wagmi, Viem, or any EIP-1193 provider
- ⚡ **No Wallet Popups** - Execute transactions seamlessly once session key is active
- 🪶 **Lightweight** - Only one dependency (`rlp`)
- 🔒 **Type Safe** - Full TypeScript support
- ⚛️ **React Ready** - Optional React hooks included

## Installation

```bash
npm install @tenprotocol/session-keys
```

## Quick Start

```typescript
import { 
  createSessionKey, 
  fundSessionKey, 
  activateSessionKey, 
  sendTransaction 
} from '@tenprotocol/session-keys'

// 1. Setup session key (one time)
const provider = window.ethereum // or any EIP-1193 provider
const userAddress = '0x...' // Connected user address

const sessionKey = await createSessionKey(provider)
await fundSessionKey(sessionKey, '0.025', provider, userAddress)
await activateSessionKey(provider)

// 2. Execute transactions without wallet popups
await sendTransaction({
  to: '0x...',
  data: '0x...',  // Your encoded contract call
  value: '0x0'
}, provider)
```

## API Reference

### Session Key Management

#### `createSessionKey(provider)`
Creates a new session key or retrieves existing one.

```typescript
const sessionKey = await createSessionKey(provider)
// Returns: "0x742d35Cc6635C0532925a3b8D29187cf8b4E87f1"
```

#### `fundSessionKey(sessionKeyAddress, amount, provider, userAddress)`
Funds the session key with ETH for transaction fees.

```typescript
await fundSessionKey(sessionKey, '0.025', provider, userAddress)
```

#### `activateSessionKey(provider)`
Activates the session key for transaction execution.

```typescript
await activateSessionKey(provider)
```

#### `deactivateSessionKey(provider)`
Deactivates the session key.

```typescript
await deactivateSessionKey(provider)
```

#### `deleteSessionKey(provider)`
Permanently deletes the session key.

```typescript
await deleteSessionKey(provider)
```

#### `cleanupSessionKey(provider)`
Deactivates and deletes the session key in one call.

```typescript
await cleanupSessionKey(provider)
```

### Transaction Execution

#### `sendTransaction(txParams, provider)`
Executes a transaction using the active session key.

```typescript
await sendTransaction({
  to: '0x...',
  data: '0x...',
  value: '0x0',
  // Optional gas parameters
  gasLimit: 100000,
  maxFeePerGas: '20000000000',
  maxPriorityFeePerGas: '1000000000'
}, provider)
```

### State Management

#### State Getters
```typescript
import { 
  getSessionKey, 
  getIsActive, 
  getBalance, 
  getIsLoading, 
  getError 
} from '@tenprotocol/session-keys'

const sessionKey = getSessionKey()        // string | null
const isActive = getIsActive()            // boolean
const balance = getBalance()              // { eth: number, estimatedTransactions: number } | null
const isLoading = getIsLoading()          // boolean
const error = getError()                  // Error | null
```

#### State Subscription
```typescript
import { subscribeToState } from '@tenprotocol/session-keys'

const unsubscribe = subscribeToState((state) => {
  console.log('Session key state updated:', state)
})

// Later: unsubscribe()
```

## React Integration

```typescript
import { useSessionKeyState } from '@tenprotocol/session-keys/react'

function MyComponent() {
  const { sessionKey, isActive, balance, isLoading, error } = useSessionKeyState()
  
  return (
    <div>
      <p>Session Key: {sessionKey}</p>
      <p>Active: {isActive ? 'Yes' : 'No'}</p>
      <p>Balance: {balance?.eth} ETH</p>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

## Framework Examples

### With Ethers.js
```typescript
import { ethers } from 'ethers'
import { sendTransaction } from '@tenprotocol/session-keys'

const provider = new ethers.BrowserProvider(window.ethereum)
const contract = new ethers.Contract(address, abi, provider)

// Encode function call
const data = contract.interface.encodeFunctionData('transfer', [recipient, amount])

// Execute with session key
await sendTransaction({
  to: address,
  data: data
}, provider)
```

### With Viem
```typescript
import { encodeFunctionData } from 'viem'
import { sendTransaction } from '@tenprotocol/session-keys'

const data = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'transfer',
  args: [recipient, amount]
})

await sendTransaction({
  to: tokenAddress,
  data: data
}, walletClient)
```

### With Wagmi
```typescript
import { prepareWriteContract } from 'wagmi'
import { sendTransaction } from '@tenprotocol/session-keys'

const { config } = await prepareWriteContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [recipient, amount]
})

await sendTransaction({
  to: config.address,
  data: config.data
}, walletClient)
```

## Complete Example

```typescript
import { 
  createSessionKey,
  fundSessionKey,
  activateSessionKey,
  sendTransaction,
  getSessionKey,
  getIsActive
} from '@tenprotocol/session-keys'

async function setupAndUseSessionKey() {
  const provider = window.ethereum
  const [userAddress] = await provider.request({ method: 'eth_accounts' })
  
  // 1. Setup session key
  const sessionKey = await createSessionKey(provider)
  console.log('Created session key:', sessionKey)
  
  // 2. Fund with ETH for transaction fees
  await fundSessionKey(sessionKey, '0.025', provider, userAddress)
  console.log('Funded session key')
  
  // 3. Activate for transaction execution
  await activateSessionKey(provider)
  console.log('Activated session key')
  
  // 4. Now execute transactions without wallet popups
  const tokenTransferData = '0xa9059cbb...' // Your encoded contract call
  
  const txHash = await sendTransaction({
    to: '0x...', // Token contract address
    data: tokenTransferData,
    value: '0x0'
  }, provider)
  
  console.log('Transaction sent:', txHash)
}
```

## Error Handling

```typescript
try {
  await sendTransaction({
    to: '0x...',
    data: '0x...'
  }, provider)
} catch (error) {
  if (error.message.includes('No active session key')) {
    // Handle session key not ready
    console.log('Please create and activate a session key first')
  } else if (error.message.includes('Insufficient')) {
    // Handle insufficient funds
    console.log('Session key needs more ETH funding')
  } else {
    // Handle other errors
    console.error('Transaction failed:', error)
  }
}
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import type { 
  EIP1193Provider, 
  TransactionParams, 
  SessionKeyState 
} from '@tenprotocol/session-keys'

const txParams: TransactionParams = {
  to: '0x...',
  data: '0x...',
  value: '0x0',
  gasLimit: 100000
}
```

## License

MIT