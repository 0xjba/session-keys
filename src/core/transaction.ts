import { encode as rlpEncode } from 'rlp'
import type { EIP1193Provider, TransactionParams } from '../types'
import { TEN_ADDRESSES, TEN_CHAIN_ID, DEFAULT_GAS_SETTINGS } from '../utils/constants'
import { toHex, hexToBytes } from '../utils/encoding'
import { getSessionKey, updateState } from './state'

const checkTenNetwork = async (provider: EIP1193Provider): Promise<void> => {
  const chainId = await provider.request({ method: 'eth_chainId' })
  const chainIdInt = parseInt(chainId, 16)
  
  if (chainIdInt !== TEN_CHAIN_ID) {
    throw new Error('Session Keys is only for TEN chain, please add or switch to TEN.')
  }
}

const calculateGasFees = async (
  provider: EIP1193Provider,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> => {
  const { BASE_FEE_MULTIPLIERS } = DEFAULT_GAS_SETTINGS
  
  try {
    // Get fee history for last block
    const feeHistory = await provider.request({
      method: 'eth_feeHistory',
      params: [
        1,  // just get latest block
        'latest',
        []   // no percentiles needed since we don't get rewards
      ]
    })

    console.log('Fee history response:', feeHistory)

    if (!feeHistory?.baseFeePerGas?.[0]) {
      throw new Error('Invalid fee history response')
    }

    // Get base fee from response
    const baseFee = BigInt(feeHistory.baseFeePerGas[0])
    console.log('Base fee:', baseFee.toString())
    
    // Use a fixed priority fee since the network doesn't provide reward data
    const priorityFeePerGas = BigInt(100000000) // 0.1 gwei
    
    // Calculate max fee using appropriate multiplier
    const multiplier = BASE_FEE_MULTIPLIERS[priority]
    const maxFeePerGas = BigInt(Math.floor(Number(baseFee) * multiplier)) + priorityFeePerGas
    console.log('Priority fee:', priorityFeePerGas.toString())
    console.log('Max fee:', maxFeePerGas.toString())

    return { maxFeePerGas, maxPriorityFeePerGas: priorityFeePerGas }
  } catch (error) {
    console.warn('Error getting fee history, using fallback values:', error)
    // Fallback to fixed values if anything goes wrong
    const baseFeePerGas = BigInt(1000000000) // 1 gwei
    const priorityFeePerGas = BigInt(100000000) // 0.1 gwei
    const multiplier = BASE_FEE_MULTIPLIERS[priority]
    const maxFeePerGas = BigInt(Math.floor(Number(baseFeePerGas) * multiplier)) + priorityFeePerGas
    return { maxFeePerGas, maxPriorityFeePerGas: priorityFeePerGas }
  }
}

export const sendTransaction = async (
  txParams: TransactionParams,
  provider: EIP1193Provider
): Promise<string> => {
  try {
    updateState({ isLoading: true, error: null })

    // Check if connected to TEN network
    await checkTenNetwork(provider)

    const sessionKeyAddress = getSessionKey()
    if (!sessionKeyAddress) {
      throw new Error('No active session key. Create and activate a session key first.')
    }

    // 1. Get chain ID
    const chainId = await provider.request({ method: 'eth_chainId' })
    const chainIdInt = parseInt(chainId, 16)

    // 2. Get nonce
    let nonce: number
    if (txParams.nonce !== undefined) {
      nonce = txParams.nonce
    } else {
      const nonceHex = await provider.request({
        method: 'eth_getTransactionCount',
        params: [sessionKeyAddress, 'latest']
      })
      nonce = parseInt(nonceHex, 16)
    }

    // 3. Calculate gas fees
    let maxFeePerGas: bigint
    let maxPriorityFeePerGas: bigint

    if (txParams.maxFeePerGas && txParams.maxPriorityFeePerGas) {
      maxFeePerGas = BigInt(txParams.maxFeePerGas)
      maxPriorityFeePerGas = BigInt(txParams.maxPriorityFeePerGas)
    } else {
      // Use dynamic fee calculation
      const gasFees = await calculateGasFees(provider, 'MEDIUM')
      maxFeePerGas = gasFees.maxFeePerGas
      maxPriorityFeePerGas = gasFees.maxPriorityFeePerGas
    }

    // 4. Get gas limit (use provided or estimate)
    let gasLimit: number
    if (txParams.gasLimit) {
      gasLimit = txParams.gasLimit
    } else {
      const gasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          to: txParams.to,
          data: txParams.data,
          value: txParams.value || '0x0',
          from: sessionKeyAddress
        }]
      })
      gasLimit = parseInt(gasEstimate, 16)
    }

    // 5. Build EIP-1559 transaction array
    const txArray = [
      toHex(chainIdInt),                    // chainId
      nonce === 0 ? '0x' : toHex(nonce),    // nonce (special case for 0)
      toHex(maxPriorityFeePerGas),         // maxPriorityFeePerGas
      toHex(maxFeePerGas),                 // maxFeePerGas
      toHex(gasLimit),                     // gasLimit
      txParams.to.toLowerCase(),           // to (ensure lowercase)
      txParams.value?.toLowerCase() || '0x0', // value (ensure lowercase)
      txParams.data?.toLowerCase() || '0x',  // data (ensure lowercase)
      [],                                  // accessList (empty for now)
      '0x',                                // v (signature placeholder)
      '0x',                                // r (signature placeholder)
      '0x'                                 // s (signature placeholder)
    ].map(value => {
      // Ensure all hex strings start with 0x
      if (typeof value === 'string' && !value.startsWith('0x')) {
        return '0x' + value;
      }
      return value;
    });

    // 6. RLP encode the transaction
    const rlpEncoded = rlpEncode(txArray)
    
    // 7. Prepare EIP-1559 transaction (type 2)
    // Convert RLP result to hex string - handle any type
    let rlpHex: string
    
    // The RLP library returns a Buffer or Uint8Array
    if (rlpEncoded && typeof rlpEncoded === 'object' && 'length' in rlpEncoded) {
      // It's array-like (Buffer or Uint8Array)
      const bytes = Array.from(rlpEncoded as Uint8Array)
      rlpHex = bytes.map((byte: number) => byte.toString(16).padStart(2, '0')).join('')
    } else {
      // Fallback - shouldn't happen with RLP but just in case
      throw new Error('Unexpected RLP encoding result')
    }
    
    const txBytes = new Uint8Array([
      2,                           // EIP-1559 transaction type
      ...hexToBytes('0x' + rlpHex) // RLP encoded transaction
    ])

    // 8. Convert to base64 for TEN
    const txBase64 = btoa(String.fromCharCode(...txBytes))

    // 9. Send through TEN session key execution
    const txHash = await provider.request({
      method: 'eth_getStorageAt',
      params: [
        TEN_ADDRESSES.SESSION_KEY_EXECUTE,
        txBase64,
        'latest'
      ]
    })

    updateState({ isLoading: false })
    return txHash

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Transaction failed')
    updateState({ error: err, isLoading: false })
    throw err
  }
}