import type { EIP1193Provider } from '../types'
import { TEN_ADDRESSES, TEN_CHAIN_ID } from '../utils/constants'
import { updateState, clearPersistedState } from './state'
import { parseEther, toHex, formatEther, estimateTransactions } from '../utils/encoding'

// Track provider event listeners
let providerCleanup: (() => void) | null = null

const setupProviderListeners = (provider: EIP1193Provider) => {
  if (providerCleanup) {
    providerCleanup()
  }

  const handleDisconnect = () => {
    updateState({ 
      isActive: false,
      error: new Error('Provider disconnected')
    })
  }

  const handleChainChanged = () => {
    updateState({ 
      isActive: false,
      error: new Error('Chain changed')
    })
  }

  provider.on?.('disconnect', handleDisconnect)
  provider.on?.('chainChanged', handleChainChanged)

  providerCleanup = () => {
    provider.removeListener?.('disconnect', handleDisconnect)
    provider.removeListener?.('chainChanged', handleChainChanged)
  }
}

const checkTenNetwork = async (provider: EIP1193Provider): Promise<void> => {
  const chainId = await provider.request({ method: 'eth_chainId' })
  const chainIdInt = parseInt(chainId, 16)
  
  if (chainIdInt !== TEN_CHAIN_ID) {
    throw new Error('Session Keys is only for TEN chain, please add or switch to TEN.')
  }
}

export const createSessionKey = async (provider: EIP1193Provider): Promise<string> => {
  try {
    updateState({ isLoading: true, error: null })

    // Setup provider listeners
    setupProviderListeners(provider)

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    console.log('🔑 Creating session key on TEN network...')
    console.log('🔑 Using address:', TEN_ADDRESSES.SESSION_KEY_CREATE)

    // Try to create a new session key
    const response = await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_CREATE,
        '0x0',
        'latest'
      ]
    })

    console.log('🔑 Create response:', response)

    if (!response || response === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('🔑 Creation failed, trying to retrieve existing session key...')
      
      // If creation failed, try to retrieve existing session key
      const existingKey = await provider.request({
        method: 'eth_getStorageAt',
        params: [
          TEN_ADDRESSES.SESSION_KEY_RETRIEVE,
          '0x0',
          'latest'
        ]
      })

      console.log('🔑 Existing key response:', existingKey)

      if (existingKey && existingKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const sessionKeyAddress = '0x' + existingKey.slice(-40) // Extract address from response
        console.log('🔑 Retrieved existing session key:', sessionKeyAddress)
        updateState({ 
          sessionKey: sessionKeyAddress,
          isLoading: false 
        })
        return sessionKeyAddress
      }

      throw new Error('Failed to create session key - both creation and retrieval returned empty response')
    }

    const sessionKeyAddress = '0x' + response.slice(-40) // Extract address from response
    console.log('🔑 Created new session key:', sessionKeyAddress)
    updateState({ 
      sessionKey: sessionKeyAddress,
      isLoading: false 
    })

    return sessionKeyAddress
  } catch (error) {
    console.error('🔑 Session key creation error:', error)
    const err = error instanceof Error ? error : new Error('Unknown error')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const fundSessionKey = async (
  sessionKeyAddress: string,
  amount: string,
  provider: EIP1193Provider,
  userAddress: string
): Promise<string> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    console.log('💰 Funding session key:', sessionKeyAddress, 'with', amount, 'ETH')

    // Convert amount to hex
    const valueInWei = parseEther(amount)
    const valueHex = toHex(valueInWei)

    // Send transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        to: sessionKeyAddress,
        value: valueHex,
        from: userAddress
      }]
    })

    console.log('💰 Funding transaction sent:', txHash)

    // Monitor transaction confirmation
    const checkTx = async () => {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
      if (receipt) {
        console.log('💰 Funding confirmed!')
        return receipt
      }
      // Check again in 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      return checkTx()
    }

    await checkTx()
    updateState({ isLoading: false })
    return txHash

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const activateSessionKey = async (provider: EIP1193Provider): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_ACTIVATE,
        '0x0',
        'latest'
      ]
    })

    updateState({ 
      isActive: true,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Activation failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const deactivateSessionKey = async (provider: EIP1193Provider): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DEACTIVATE,
        '0x0',
        'latest'
      ]
    })

    updateState({ 
      isActive: false,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Deactivation failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const deleteSessionKey = async (provider: EIP1193Provider): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DELETE,
        '0x0',
        'latest'
      ]
    })

    // Clear persisted state when deleting
    clearPersistedState()
    
    // Remove provider listeners
    if (providerCleanup) {
      providerCleanup()
      providerCleanup = null
    }

    updateState({ 
      sessionKey: null,
      isActive: false,
      balance: null,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Deletion failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

export const cleanupSessionKey = async (provider: EIP1193Provider): Promise<void> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    // First deactivate
    await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DEACTIVATE,
        '0x0',
        'latest'
      ]
    })

    // Then delete
    await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_DELETE,
        '0x0',
        'latest'
      ]
    })

    updateState({ 
      sessionKey: null,
      isActive: false,
      balance: null,
      isLoading: false 
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Cleanup failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}

// Helper function to update balance
const updateBalance = async (sessionKeyAddress: string, provider: EIP1193Provider): Promise<void> => {
  try {
    const balanceHex = await provider.request({
      method: 'eth_getBalance',
      params: [sessionKeyAddress, 'latest']
    })

    const balanceWei = BigInt(balanceHex)
    const ethBalance = formatEther(balanceWei)
    
    updateState({
      balance: {
        eth: ethBalance,
        estimatedTransactions: estimateTransactions(ethBalance)
      }
    })
  } catch (error) {
    console.warn('Failed to update balance:', error)
  }
}