export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  error?: boolean;
}

// ── FastAPI contract types ──────────────────────────────

export interface ChatRequest {
  session_id: string;
  message: string;
  language_code?: string | null;
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export interface TtsSegment {
  mime: string;
  data: string;
}

export interface TtsRequest {
  text: string;
  target_language_code: string;
}

export interface TtsResponse {
  segments: TtsSegment[];
}

export interface TranscribeResponse {
  text: string;
  language: string | null;
  language_probability: number | null;
}
