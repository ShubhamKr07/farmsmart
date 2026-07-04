import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption for OAuth tokens at rest (accounting_connections
 * table). Key derived from ACCOUNTING_ENCRYPTION_KEY (required env, 32+ chars)
 * via scrypt with a fixed salt — the key itself never touches the DB.
 *
 * Encrypted format: base64(iv[12] + authTag[16] + ciphertext).
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.ACCOUNTING_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ACCOUNTING_ENCRYPTION_KEY environment variable is required");
  }
  return scryptSync(secret, "farmsmart-accounting-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
