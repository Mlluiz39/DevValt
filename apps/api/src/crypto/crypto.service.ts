/**
 * DevVault Zero-Knowledge Cryptography Module
 * 
 * ARCHITECTURE:
 * - The server NEVER sees plaintext secrets
 * - Client derives an encryption key from master password using Argon2id
 * - AES-256-GCM provides authenticated encryption
 * - Each secret has its own unique salt + IV
 * 
 * FLOW:
 * 1. Client has MasterPassword
 * 2. Client generates unique salt (32 bytes)
 * 3. Client derives EncryptionKey = Argon2id(MasterPassword, salt)
 * 4. Client generates unique IV (12 bytes for GCM)
 * 5. Client encrypts: {encryptedValue, authTag} = AES-256-GCM(value, EncryptionKey, IV)
 * 6. Client sends: {encryptedValue, iv, authTag, salt} to server
 * 7. Server stores ONLY the encrypted blob — plaintext never touches the server
 * 
 * For SERVER-SIDE operations (API key rotation, etc), we use a different scheme
 * where the encrypted value is re-encrypted by the client before sending.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  timingSafeEqual,
} from 'crypto';
import argon2 from 'argon2';
import { env } from '../config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  encryptedValue: string; // base64
  iv: string;             // base64, 12 bytes for GCM
  authTag: string;        // base64, 16 bytes
  salt: string;           // base64, 32 bytes - for key derivation
}

export interface DeriveKeyOptions {
  memoryCost?: number;   // in KiB
  timeCost?: number;     // iterations
  parallelism?: number;
}

// Argon2id parameters (OWASP recommended for interactive login)
const ARGON2_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,     // 256 bits = AES-256 key
};

// GCM parameters
const IV_LENGTH = 12;    // 96 bits - recommended for GCM
const SALT_LENGTH = 32;  // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derives an AES-256 key from a master password using Argon2id.
 * This is the client-side operation — the server NEVER calls this
 * with plaintext passwords.
 * 
 * @param masterPassword - User's master password (NEVER log this)
 * @param salt - Random 32-byte salt (base64 encoded)
 * @returns Derived key as Buffer (32 bytes)
 */
export async function deriveEncryptionKey(
  masterPassword: string,
  salt: string
): Promise<Buffer> {
  const saltBuffer = Buffer.from(salt, 'base64');
  
  // Argon2id outputs a hash that we use directly as the AES key
  const hash = await argon2.hash(masterPassword, {
    ...ARGON2_PARAMS,
    raw: true, // Return raw bytes, not encoded string
    salt: saltBuffer,
  });

  return hash;
}

/**
 * Generates a new random salt for key derivation.
 * Must be unique per secret.
 */
export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * Generates a new random IV for AES-GCM.
 * Must be unique per encryption operation.
 */
export function generateIV(): string {
  return randomBytes(IV_LENGTH).toString('base64');
}

// ─── Encryption / Decryption ─────────────────────────────────────────────────

/**
 * Encrypts a value using AES-256-GCM.
 * 
 * This should be called CLIENT-SIDE with a derived key.
 * The result is the encrypted payload that can be safely stored server-side.
 * 
 * @param plaintext - The secret value to encrypt (NEVER log this)
 * @param derivedKey - AES-256 key derived from master password
 * @returns Encrypted payload with IV and auth tag
 */
export function encryptValue(plaintext: string, derivedKey: Buffer): Omit<EncryptedPayload, 'salt'> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts a value using AES-256-GCM.
 * 
 * This should be called CLIENT-SIDE with a derived key.
 * The server should NEVER decrypt secrets — only relay encrypted blobs.
 * 
 * @param payload - The encrypted payload from storage
 * @param derivedKey - AES-256 key derived from master password
 * @returns Decrypted plaintext (HANDLE WITH CARE - NEVER LOG)
 */
export function decryptValue(
  payload: Omit<EncryptedPayload, 'salt'>,
  derivedKey: Buffer
): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const encryptedData = Buffer.from(payload.encryptedValue, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(), // Will throw if auth tag is invalid (tampered data)
  ]);

  return decrypted.toString('utf8');
}

// ─── Password Hashing ────────────────────────────────────────────────────────

/**
 * Hashes a user's authentication password using Argon2id.
 * Different from key derivation - this is for login verification.
 * 
 * @param password - User's auth password (NEVER log this)
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verifies a password against a stored Argon2id hash.
 * Uses constant-time comparison internally.
 * 
 * @param hash - Stored Argon2id hash
 * @param password - User input to verify (NEVER log this)
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ─── API Key Generation ──────────────────────────────────────────────────────

/**
 * Generates a secure API key for CI/CD integration.
 * Format: dvk_<base58-random-bytes>
 * 
 * @returns { key: string (full key - shown once), keyHash: string (stored), keyPrefix: string (display) }
 */
export function generateApiKey(): {
  key: string;
  keyHash: string;
  keyPrefix: string;
} {
  const randomPart = randomBytes(32).toString('hex');
  const key = `dvk_${randomPart}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = `dvk_${randomPart.substring(0, 8)}`;

  return { key, keyHash, keyPrefix };
}

/**
 * Hashes an API key using SHA-256 for storage.
 * SHA-256 is appropriate here because API keys are long (256 bits of entropy).
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Constant-time comparison for API key validation.
 * Prevents timing attacks.
 */
export function compareApiKey(inputHash: string, storedHash: string): boolean {
  try {
    return timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex'),
    );
  } catch {
    return false;
  }
}

// ─── Token Utilities ─────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure random token.
 * Used for email verification, password reset, etc.
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hashes a token for storage (email verification, etc.)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Server-side Encryption (for non-ZK metadata) ────────────────────────────

/**
 * Server-side symmetric encryption for non-critical metadata
 * (e.g., TOTP secrets, internal tokens).
 * Uses the MASTER_ENCRYPTION_KEY as the key.
 * 
 * IMPORTANT: This is NOT used for user secrets (which use ZK).
 * Only used for server-managed data like 2FA secrets.
 */
export function serverEncrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = Buffer.from(env.MASTER_ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function serverDecrypt(encrypted: string, iv: string, authTag: string): string {
  const key = Buffer.from(env.MASTER_ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates that an encrypted payload has all required fields and valid formats.
 */
export function validateEncryptedPayload(payload: Partial<EncryptedPayload>): payload is EncryptedPayload {
  if (!payload.encryptedValue || !payload.iv || !payload.authTag || !payload.salt) {
    return false;
  }

  try {
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const salt = Buffer.from(payload.salt, 'base64');

    return (
      iv.length === IV_LENGTH &&
      authTag.length === AUTH_TAG_LENGTH &&
      salt.length === SALT_LENGTH &&
      payload.encryptedValue.length > 0
    );
  } catch {
    return false;
  }
}
