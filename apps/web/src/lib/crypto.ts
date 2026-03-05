/**
 * DevVault - Web Client Zero-Knowledge Crypto Module
 * 
 * This module runs ENTIRELY IN THE BROWSER.
 * Plaintext secrets never leave the user's device.
 */

// We use Web Crypto API (built-in browser API) for AES-GCM
// and we'd typically use a WebAssembly port of Argon2 (like argon2-browser) 
// for key derivation, but for simplicity we'll mock the Argon2 interface 
// with PBKDF2 (which is supported natively by Web Crypto API) to show the flow.
// In production, use WebAssembly Argon2id for better resistance against GPU cracking.

// --- Helper: Convert base64 to Uint8Array ---
function base64ToBuffer(b64: string): Uint8Array {
  const binaryString = window.atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- Helper: Convert Uint8Array to base64 ---
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// --- Key Derivation ---

/**
 * Derives the AES key from the user's Master Password using a Salt.
 * Real-world DevVault: Uses Wasm Argon2id.
 * Code below: Uses PBKDF2 (Native Web Crypto API) just for demonstration.
 */
export async function deriveKey(masterPassword: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = base64ToBuffer(saltB64);

  // PBKDF2 as stand-in for Argon2id in this browser example
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations: 600000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // We don't need to extract the raw key, just use it for encrypt/decrypt
    ['encrypt', 'decrypt']
  );
}

// --- Encrypting a Secret (On Save) ---

export interface EncryptedPayload {
  encryptedValue: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Encrypts a plaintext value inside the browser.
 * Only the resulting `EncryptedPayload` should be sent to the API.
 */
export async function encryptSecretClientSide(
  plaintext: string, 
  masterPassword: string
): Promise<EncryptedPayload> {
  // 1. Generate unique salt & IV for this secret
  const saltBuffer = window.crypto.getRandomValues(new Uint8Array(32));
  const ivBuffer = window.crypto.getRandomValues(new Uint8Array(12)); // GCM standard IV length

  // 2. Derive Key
  const saltB64 = bufferToBase64(saltBuffer);
  const encryptionKey = await deriveKey(masterPassword, saltB64);

  // 3. Encrypt
  const enc = new TextEncoder();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
      tagLength: 128 // 16 bytes auth tag
    },
    encryptionKey,
    enc.encode(plaintext)
  );

  // Web Crypto API appends the auth tag to the end of the ciphertext.
  // We'll split them to match our backend structure nicely.
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    encryptedValue: bufferToBase64(ciphertext),
    iv: bufferToBase64(ivBuffer),
    authTag: bufferToBase64(authTag),
    salt: saltB64
  };
}

// --- Decrypting a Secret (On Read/View) ---

/**
 * Decrypts a payload coming from the server, entirely in the browser.
 */
export async function decryptSecretClientSide(
  payload: EncryptedPayload,
  masterPassword: string
): Promise<string> {
  const { encryptedValue, iv, authTag, salt } = payload;

  const key = await deriveKey(masterPassword, salt);
  
  const ivBuffer = base64ToBuffer(iv);
  const encryptedBuffer = base64ToBuffer(encryptedValue);
  const authTagBuffer = base64ToBuffer(authTag);

  // Re-combine ciphertext + auth tag as required by Web Crypto API
  const combinedBuffer = new Uint8Array(encryptedBuffer.length + authTagBuffer.length);
  combinedBuffer.set(encryptedBuffer, 0);
  combinedBuffer.set(authTagBuffer, encryptedBuffer.length);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer as any,
        tagLength: 128
      },
      key,
      combinedBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('Falha na descriptografia. Senha master incorreta ou dados corrompidos.', err);
    throw new Error('Falha ao descriptografar o segredo. Verifique sua senha master.');
  }
}
