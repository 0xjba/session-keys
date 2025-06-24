export const toHex = (value: number | bigint | string): string => {
  // Convert to hex string and remove leading zeros
  let hexStr = BigInt(value).toString(16)
  // Ensure at least one digit
  hexStr = hexStr || '0'
  // Add 0x prefix
  return '0x' + hexStr
}

export const hexToBytes = (hex: string): Uint8Array => {
  const cleanHex = hex.replace('0x', '')
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
  }
  return bytes
}

export const bytesToHex = (bytes: Uint8Array): string => {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const parseEther = (value: string): bigint => {
  const [whole, decimal = ''] = value.split('.')
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18)
  return BigInt(whole + paddedDecimal)
}

export const formatEther = (wei: bigint): number => {
  const ethString = wei.toString()
  if (ethString.length <= 18) {
    return parseFloat('0.' + ethString.padStart(18, '0'))
  }
  const wholePart = ethString.slice(0, -18)
  const decimalPart = ethString.slice(-18)
  return parseFloat(wholePart + '.' + decimalPart)
}

export const estimateTransactions = (ethBalance: number): number => {
  // Rough estimate: each transaction costs ~0.005 ETH
  return Math.floor(ethBalance / 0.005)
}