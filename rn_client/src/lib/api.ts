import { Platform } from "react-native";
import type { ChatRequest, ChatResponse, TtsResponse } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;

function defaultApiBase(): string {
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://localhost:8000";
}

export function getBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, "");
  return defaultApiBase();
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("Request timed out.");
    const msg = e instanceof Error ? e.message : String(e);
    if (
      e instanceof TypeError ||
      /Network request failed|Failed to fetch/i.test(msg)
    ) {
      throw new Error(
        `Cannot reach ${url}. Ensure the FastAPI server is running (port 8000).`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureOk<T>(res: Response, label: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail ?? `${label} failed`);
    throw new Error(detail);
  }
  return body as T;
}

// ── Public API ──────────────────────────────────────────

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify(req),
  });
  return ensureOk<ChatResponse>(res, "Chat");
}

export async function textToSpeech(
  text: string,
  targetLanguageCode = "en-IN",
): Promise<TtsResponse> {
  const res = await apiFetch("/tts", {
    method: "POST",
    body: JSON.stringify({ text, target_language_code: targetLanguageCode }),
  });
  return ensureOk<TtsResponse>(res, "TTS");
}

export async function checkServer(): Promise<boolean> {
  try {
    const url = `${getBaseUrl()}/openapi.json`;
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
