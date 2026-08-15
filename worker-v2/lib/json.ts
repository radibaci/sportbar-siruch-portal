import type { Context } from "hono";
import type { AppEnv } from "../types";
import { AppError } from "./errors";

const MAX_JSON_BODY_BYTES = 32 * 1024;

export async function readJsonObject(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  const contentType = c.req.header("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AppError(415, "unsupported_media_type", "Body must be JSON.");
  }

  const contentLength = Number(c.req.header("Content-Length") || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new AppError(413, "payload_too_large", "JSON body is too large.");
  }

  const body = c.req.raw.body;
  if (!body) throw new AppError(400, "invalid_json", "JSON body is required.");

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    byteLength += result.value.byteLength;
    if (byteLength > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new AppError(413, "payload_too_large", "JSON body is too large.");
    }
    chunks.push(result.value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new AppError(400, "invalid_json", "Body contains invalid JSON.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "invalid_body", "JSON body must be an object.");
  }
  return value as Record<string, unknown>;
}

export function readString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new AppError(400, "invalid_field", `${field} must be text.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new AppError(400, "invalid_field", `${field} has an invalid length.`);
  }
  return normalized;
}

export function readSecret(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value || value.length > maxLength) {
    throw new AppError(400, "invalid_field", `${field} has an invalid length.`);
  }
  return value;
}
