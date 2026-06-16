import { Capacitor } from '@capacitor/core'
import { setCryptoKey, generateKey } from './crypto'

const KEY_STORAGE_NAME = 'prayercycles-enc-key'

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

async function loadKeyNative(): Promise<Uint8Array | null> {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  await SecureStorage.setSynchronize(true)
  const stored = await SecureStorage.getItem(KEY_STORAGE_NAME)
  if (stored) return base64ToUint8(stored)
  return null
}

async function saveKeyNative(key: Uint8Array): Promise<void> {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  await SecureStorage.setSynchronize(true)
  await SecureStorage.setItem(KEY_STORAGE_NAME, uint8ToBase64(key))
}

function loadKeyWeb(): Uint8Array | null {
  const stored = localStorage.getItem(KEY_STORAGE_NAME)
  if (stored) return base64ToUint8(stored)
  return null
}

function saveKeyWeb(key: Uint8Array): void {
  localStorage.setItem(KEY_STORAGE_NAME, uint8ToBase64(key))
}

let _initPromise: Promise<void> | null = null

export function initEncryption(): Promise<void> {
  // Single-flight: React StrictMode double-invokes startup effects;
  // both calls must share one init so the key is only generated once.
  if (!_initPromise) {
    _initPromise = doInitEncryption().catch((err) => {
      _initPromise = null
      throw err
    })
  }
  return _initPromise
}

async function doInitEncryption(): Promise<void> {
  const isNative = Capacitor.isNativePlatform()

  let key: Uint8Array | null = null

  if (isNative) {
    key = await loadKeyNative()
    if (!key) {
      key = generateKey()
      await saveKeyNative(key)
    }
  } else {
    key = loadKeyWeb()
    if (!key) {
      key = generateKey()
      saveKeyWeb(key)
    }
  }

  setCryptoKey(key)
}
