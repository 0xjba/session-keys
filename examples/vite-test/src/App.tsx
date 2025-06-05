import { useState } from 'react'
import { createPublicClient, http, createWalletClient, custom, formatEther, parseEther } from 'viem'
import { mainnet } from 'viem/chains'
import { 
  createSessionKey,
  activateSessionKey,
  deactivateSessionKey,
  deleteSessionKey,
  cleanupSessionKey,
  fundSessionKey,
  sendTransaction
} from '@tenprotocol/session-keys'

// Add ethereum property to window type
declare global {
  interface Window {
    ethereum: any;
  }
}

// Helper function to estimate transactions (copied from package)
const estimateTransactions = (ethBalance: number): number => {
  // Rough estimate: each transaction costs ~0.005 ETH
  return Math.floor(ethBalance / 0.005)
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [sessionKey, setSessionKey] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [sessionKeyBalance, setSessionKeyBalance] = useState<{ eth: number; estimatedTransactions: number } | null>(null)

  // Initialize viem public client
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http()
  })

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      setAccount(accounts[0])
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }

  const handleCreateSessionKey = async () => {
    try {
      if (!window.ethereum) throw new Error('No provider')
      const key = await createSessionKey(window.ethereum)
      setSessionKey(key)
      // Check balance after creating
      await handleCheckBalance()
    } catch (error) {
      console.error('Error creating session key:', error)
    }
  }

  const handleActivateSessionKey = async () => {
    try {
      if (!window.ethereum) throw new Error('No provider')
      await activateSessionKey(window.ethereum)
      alert('Session key activated!')
    } catch (error) {
      console.error('Error activating session key:', error)
    }
  }

  const handleFundSessionKey = async () => {
    try {
      if (!window.ethereum || !sessionKey || !account) throw new Error('Missing requirements')
      await fundSessionKey(sessionKey, '0.1', window.ethereum, account)
      alert('Session key funded!')
      // Update balance after funding
      await handleCheckBalance()
    } catch (error) {
      console.error('Error funding session key:', error)
    }
  }

  const handleDeactivateSessionKey = async () => {
    try {
      if (!window.ethereum) throw new Error('No provider')
      await deactivateSessionKey(window.ethereum)
      alert('Session key deactivated!')
    } catch (error) {
      console.error('Error deactivating session key:', error)
    }
  }

  const handleDeleteSessionKey = async () => {
    try {
      if (!window.ethereum) throw new Error('No provider')
      await deleteSessionKey(window.ethereum)
      setSessionKey('')
      setSessionKeyBalance(null)
      alert('Session key deleted!')
    } catch (error) {
      console.error('Error deleting session key:', error)
    }
  }

  const handleCleanup = async () => {
    try {
      if (!window.ethereum) throw new Error('No provider')
      await cleanupSessionKey(window.ethereum)
      setSessionKey('')
      setSessionKeyBalance(null)
      alert('Cleanup completed!')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  const handleCheckBalance = async () => {
    try {
      if (!window.ethereum || !sessionKey) {
        throw new Error('No session key available')
      }

      // Get balance using eth_getBalance
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [sessionKey, 'latest']
      })

      // Convert balance from Wei to ETH
      const balanceWei = BigInt(balanceHex)
      const ethBalance = Number(formatEther(balanceWei))
      
      // Update state with balance and estimated transactions
      setSessionKeyBalance({
        eth: ethBalance,
        estimatedTransactions: estimateTransactions(ethBalance)
      })
    } catch (error) {
      console.error('Error checking balance:', error)
      alert(`Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSendTransaction = async () => {
    try {
      if (!window.ethereum || !recipientAddress || !amount) {
        throw new Error('Please fill in all transaction details')
      }

      // Validate and format address
      const validateAndFormatAddress = (address: string): `0x${string}` => {
        const cleanAddress = address.toLowerCase().replace('0x', '')
        if (!cleanAddress.match(/^[0-9a-f]{40}$/)) {
          throw new Error(`Invalid address format: ${address}`)
        }
        return `0x${cleanAddress}` as `0x${string}`
      }

      const formattedRecipientAddress = validateAndFormatAddress(recipientAddress)

      // Send ETH transaction using session key
      const txHash = await sendTransaction({
        to: formattedRecipientAddress,
        value: `0x${parseEther(amount).toString(16)}`.toLowerCase(),
        data: '0x'
      }, window.ethereum)

      alert(`Transaction sent! Hash: ${txHash}`)
      
      // Update balance after sending
      await handleCheckBalance()
    } catch (error) {
      console.error('Error sending transaction:', error)
      alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Session Keys Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={connectWallet}>
          {account ? 'Connected: ' + account.slice(0, 6) + '...' + account.slice(-4) : 'Connect Wallet'}
        </button>
      </div>

      {account && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p>Session Key: {sessionKey || 'No session key generated'}</p>
          
          <button onClick={handleCreateSessionKey} disabled={!account}>
            Create Session Key
          </button>
          
          <button onClick={handleActivateSessionKey} disabled={!sessionKey}>
            Activate Session Key
          </button>
          
          <button onClick={handleFundSessionKey} disabled={!sessionKey}>
            Fund Session Key (0.1 ETH)
          </button>

          <button onClick={handleCheckBalance} disabled={!sessionKey}>
            Check Balance
          </button>

          {sessionKeyBalance && (
            <div style={{ margin: '10px 0', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <p>Balance: {sessionKeyBalance.eth} ETH</p>
              <p>Estimated Transactions: {sessionKeyBalance.estimatedTransactions}</p>
            </div>
          )}
          
          <button onClick={handleDeactivateSessionKey} disabled={!sessionKey}>
            Deactivate Session Key
          </button>
          
          <button onClick={handleDeleteSessionKey} disabled={!sessionKey}>
            Delete Session Key
          </button>
          
          <button onClick={handleCleanup} disabled={!account}>
            Cleanup
          </button>

          <hr />
          
          <h3>Send ETH</h3>
          <input
            type="text"
            placeholder="Recipient Address (0x...)"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            style={{ padding: '5px', marginBottom: '5px' }}
          />
          <input
            type="text"
            placeholder="Amount in ETH"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '5px', marginBottom: '5px' }}
          />
          <button 
            onClick={handleSendTransaction} 
            disabled={!sessionKey || !recipientAddress || !amount}
          >
            Send ETH
          </button>
        </div>
      )}
    </div>
  )
}

export default App
