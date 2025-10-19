import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Key should be a 32-byte hex string (64 characters)
 */
let getEncryptionKey = (): Buffer => {
  let key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  return Buffer.from(key, 'hex');
};

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data with IV and auth tag prepended
 */
export let encrypt = (plaintext: string): string => {
  try {
    let key = getEncryptionKey();
    let iv = crypto.randomBytes(IV_LENGTH);
    let salt = crypto.randomBytes(SALT_LENGTH);

    let cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    let authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encryptedData
    return [salt.toString('hex'), iv.toString('hex'), authTag.toString('hex'), encrypted].join(
      ':'
    );
  } catch (error) {
    console.error('[Encryption] Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt data using AES-256-GCM
 */
export let decrypt = (encryptedData: string): string => {
  try {
    let key = getEncryptionKey();

    // Parse the encrypted data
    let parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    let [saltHex, ivHex, authTagHex, encrypted] = parts;

    let iv = Buffer.from(ivHex, 'hex');
    let authTag = Buffer.from(authTagHex, 'hex');

    let decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Generate a random encryption key (for development/setup)
 * This should be called once and the result stored in .env
 */
export let generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt OAuth credentials
 */
export let encryptOAuthCredentials = (accessToken: string, refreshToken?: string): string => {
  const data = JSON.stringify({
    accessToken,
    refreshToken: refreshToken || null,
    timestamp: Date.now()
  });

  return encrypt(data);
};

/**
 * Decrypt OAuth credentials
 */
export let decryptOAuthCredentials = (
  encryptedData: string
): {
  accessToken: string;
  refreshToken: string | null;
  timestamp: number;
} => {
  let decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
};

/**
 * Encrypt custom headers
 */
export let encryptCustomHeaders = (headers: Record<string, string>): string => {
  const data = JSON.stringify({
    headers,
    timestamp: Date.now()
  });

  return encrypt(data);
};

/**
 * Decrypt custom headers
 */
export let decryptCustomHeaders = (
  encryptedData: string
): {
  headers: Record<string, string>;
  timestamp: number;
} => {
  let decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
};
