import type { ApiErrorBody, ApiSuccess, HealthData } from "./types";

const DEFAULT_BASE = "http://localhost:8000";

export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, "") : DEFAULT_BASE;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: text };
  }
}

export async function fetchWelcome(): Promise<ApiSuccess<{ message: string }>> {
  const res = await fetch(`${getApiBaseUrl()}/`);
  const body = (await parseJson(res)) as ApiSuccess<{ message: string }> | ApiErrorBody;
  if (!res.ok || !body || typeof body !== "object" || body.success !== true) {
    const err = body as ApiErrorBody;
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return body;
}

export async function fetchHealth(): Promise<ApiSuccess<HealthData>> {
  const res = await fetch(`${getApiBaseUrl()}/api/health`);
  const body = (await parseJson(res)) as ApiSuccess<HealthData> | ApiErrorBody;
  if (!res.ok || !body || typeof body !== "object" || body.success !== true) {
    const err = body as ApiErrorBody;
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return body;
}
