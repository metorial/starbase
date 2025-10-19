import crypto from 'crypto';

let ALGORITHM = 'aes-256-gcm';
let IV_LENGTH = 16;
let SALT_LENGTH = 64;

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

export let encrypt = (plaintext: string): string => {
  try {
    let key = getEncryptionKey();
    let iv = crypto.randomBytes(IV_LENGTH);
    let salt = crypto.randomBytes(SALT_LENGTH);

    let cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    let authTag = cipher.getAuthTag();

    return [salt.toString('hex'), iv.toString('hex'), authTag.toString('hex'), encrypted].join(
      ':'
    );
  } catch (error) {
    console.error('[Encryption] Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
};

export let decrypt = (encryptedData: string): string => {
  try {
    let key = getEncryptionKey();

    let parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    let [saltHex, ivHex, authTagHex, encrypted] = parts;

    let iv = Buffer.from(ivHex, 'hex');
    let authTag = Buffer.from(authTagHex, 'hex');

    let decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
};

export let generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export let encryptOAuthCredentials = (accessToken: string, refreshToken?: string): string => {
  let data = JSON.stringify({
    accessToken,
    refreshToken: refreshToken || null,
    timestamp: Date.now()
  });

  return encrypt(data);
};

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

export let encryptCustomHeaders = (headers: Record<string, string>): string => {
  let data = JSON.stringify({
    headers,
    timestamp: Date.now()
  });

  return encrypt(data);
};

export let decryptCustomHeaders = (
  encryptedData: string
): {
  headers: Record<string, string>;
  timestamp: number;
} => {
  let decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
};
