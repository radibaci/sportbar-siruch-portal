import { timingSafeEqual } from "node:crypto";
import { base64UrlToBytes, bytesToBase64Url } from "../lib/crypto";

const encoder = new TextEncoder();
export const PASSWORD_ITERATIONS = 210_000;
const FAKE_SALT = "dGVubmlzLXBvcnRhbC1mYWtlLXNhbHQ";
const FAKE_HASH = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function derivePasswordBytes(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const saltBuffer = Uint8Array.from(salt).buffer;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS): Promise<{
  hash: string;
  salt: string;
  iterations: number;
}> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const hashBytes = await derivePasswordBytes(password, saltBytes, iterations);
  return {
    hash: bytesToBase64Url(hashBytes),
    salt: bytesToBase64Url(saltBytes),
    iterations,
  };
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string,
  iterations: number,
): Promise<boolean> {
  try {
    const actual = await derivePasswordBytes(password, base64UrlToBytes(salt), iterations);
    const expected = base64UrlToBytes(expectedHash);
    if (actual.byteLength !== expected.byteLength) {
      const fixed = new Uint8Array(actual.byteLength);
      timingSafeEqual(actual, fixed);
      return false;
    }
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function verifyPasswordWithoutUser(password: string): Promise<void> {
  await verifyPassword(password, FAKE_HASH, FAKE_SALT, PASSWORD_ITERATIONS);
}
