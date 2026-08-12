import nacl from 'tweetnacl'

/**
 * Data at rest is encrypted with AES-GCM through the Web Crypto API, which is
 * the platform's own implementation rather than a bundled one. That matters
 * beyond taste: shipping a third-party crypto library counts as "standard
 * encryption algorithms in addition to the encryption within Apple's operating
 * system" for export compliance, whereas using the OS implementation does not.
 *
 * Values written before this change use tweetnacl's secretbox and carry the
 * older "enc:" prefix. They are still readable here so a migration can rewrite
 * them; once no "enc:" values remain, the tweetnacl import goes away.
 */

const ENC_PREFIX = 'enc2:'
const LEGACY_PREFIX = 'enc:'

/** AES-GCM nonce length in bytes, per the WebCrypto recommendation. */
const IV_LENGTH = 12

let _key: CryptoKey | null = null
/** Raw bytes, kept only so legacy secretbox values can still be opened. */
let _legacyKey: Uint8Array | null = null

/**
 * The stored key is 32 random bytes, which is exactly an AES-256 key, so the
 * same key material serves both schemes and nothing needs re-keying.
 */
export async function setCryptoKey(key: Uint8Array): Promise<void> {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes')
  }
  _legacyKey = key
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

  if (encrypted.startsWith(LEGACY_PREFIX)) return decryptLegacy(encrypted)

  return encrypted
}

/** Opens a value written by the previous tweetnacl scheme. */
function decryptLegacy(encrypted: string): string {
  if (!_legacyKey) throw new Error('Encryption key not initialized')
  const combined = base64ToUint8(encrypted.slice(LEGACY_PREFIX.length))
  const nonce = combined.slice(0, nacl.secretbox.nonceLength)
  const ciphertext = combined.slice(nacl.secretbox.nonceLength)
  const plaintext = nacl.secretbox.open(ciphertext, nonce, _legacyKey)
  if (!plaintext) throw new Error('Decryption failed — wrong key or corrupted data')
  return new TextDecoder().decode(plaintext)
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && (value.startsWith(ENC_PREFIX) || value.startsWith(LEGACY_PREFIX))
}

/** True for values still in the old scheme, so the migration knows what to rewrite. */
export function isLegacyEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(LEGACY_PREFIX)
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
