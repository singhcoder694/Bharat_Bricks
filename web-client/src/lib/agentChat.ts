/**
 * POST /chat — companion agent backed by FastAPI.
 */

export async function sendChatMessage(
  apiBaseUrl: string,
  sessionId: string,
  message: string,
  languageCode?: string | null,
): Promise<{ session_id: string; response: string }> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/chat`;

  const body: Record<string, unknown> = {
    session_id: sessionId,
    message,
  };
  if (languageCode) body.language_code = languageCode;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : data.message ?? `Chat request failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return {
    session_id: data.session_id ?? sessionId,
    response: data.response ?? "",
  };
}
