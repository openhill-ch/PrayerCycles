/**
 * Data at rest is encrypted with AES-GCM through the Web Crypto API — the
 * platform's own implementation rather than a bundled one. That matters beyond
 * taste: shipping a third-party crypto library counts as "standard encryption
 * algorithms in addition to the encryption within Apple's operating system"
 * for export compliance, whereas using the OS implementation does not.
 *
 * The previous scheme used tweetnacl's secretbox and wrote an "enc:" prefix.
 * That library is gone, so those values can no longer be opened. The release
 * before this one rewrote them to AES on startup; anything still carrying the
 * old prefix is reported as unreadable rather than shown as raw ciphertext.
 */

const ENC_PREFIX = 'enc2:'
const LEGACY_PREFIX = 'enc:'

/** AES-GCM nonce length in bytes, per the WebCrypto recommendation. */
const IV_LENGTH = 12

let _key: CryptoKey | null = null

/** The stored key is 32 random bytes, which is exactly an AES-256 key. */
export async function setCryptoKey(key: Uint8Array): Promise<void> {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes')
  }
  _key = await crypto.subtle.importKey('raw', key as unknown as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export function hasCryptoKey(): boolean {
  return _key !== null
}

export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

export async function encryptString(plaintext: string): Promise<string> {
  if (!_key) throw new Error('Encryption key not initialized')
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, new TextEncoder().encode(plaintext)),
  )
  const combined = new Uint8Array(iv.length + ciphertext.length)
  combined.set(iv)
  combined.set(ciphertext, iv.length)
  return ENC_PREFIX + uint8ToBase64(combined)
}

export async function decryptString(encrypted: string): Promise<string> {
  if (!_key) throw new Error('Encryption key not initialized')

  if (encrypted.startsWith(ENC_PREFIX)) {
    const combined = base64ToUint8(encrypted.slice(ENC_PREFIX.length))
    const iv = combined.slice(0, IV_LENGTH)
    const ciphertext = combined.slice(IV_LENGTH)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      _key,
      ciphertext as unknown as BufferSource,
    )
    return new TextDecoder().decode(plaintext)
  }

  // Still recognised so the caller degrades to its unreadable placeholder
  // instead of printing ciphertext at someone.
  if (encrypted.startsWith(LEGACY_PREFIX)) {
    throw new Error('Value uses the retired encryption scheme and cannot be read')
  }

  return encrypted
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && (value.startsWith(ENC_PREFIX) || value.startsWith(LEGACY_PREFIX))
}

export function encryptBlob(plaintext: string): Promise<string> {
  return encryptString(plaintext)
}

export function decryptBlob(encrypted: string): Promise<string> {
  return decryptString(encrypted)
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
