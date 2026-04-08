/**
 * Sarvam AI TTS via POST /tts, with per-message playback tracking.
 * Falls back gracefully when the endpoint is unavailable.
 */

type TtsSegment = { mime: string; data: string };

const audioCache = new Map<string, AudioBuffer[]>();
const speakingSet = new Set<string>();

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentMessageId: string | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function canUseTts(apiBaseUrl?: string): boolean {
  return Boolean(apiBaseUrl?.trim());
}

export function isMessageSpeaking(messageId: string): boolean {
  return speakingSet.has(messageId);
}

export function cancelSpeechIfMessage(messageId: string): void {
  if (currentMessageId === messageId && currentSource) {
    try {
      currentSource.stop();
    } catch { /* stop may throw if already ended */ }
    currentSource = null;
  }
  speakingSet.delete(messageId);
  currentMessageId = null;
}

export async function unlockAudio(): Promise<void> {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

async function fetchTtsSegments(
  text: string,
  apiBaseUrl: string,
): Promise<TtsSegment[]> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/tts`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_language_code: "en-IN" }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return (data.segments ?? []) as TtsSegment[];
}

async function decodeSegments(segments: TtsSegment[]): Promise<AudioBuffer[]> {
  const ctx = getAudioCtx();
  const buffers: AudioBuffer[] = [];

  for (const seg of segments) {
    const binary = atob(seg.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    buffers.push(buf);
  }

  return buffers;
}

export async function prefetchTts(
  messageId: string,
  text: string,
  apiBaseUrl: string,
): Promise<void> {
  if (audioCache.has(messageId)) return;
  try {
    const segments = await fetchTtsSegments(text, apiBaseUrl);
    if (segments.length) {
      const buffers = await decodeSegments(segments);
      audioCache.set(messageId, buffers);
    }
  } catch {
    /* non-critical */
  }
}

async function playBuffers(
  messageId: string,
  buffers: AudioBuffer[],
): Promise<void> {
  const ctx = getAudioCtx();
  speakingSet.add(messageId);
  currentMessageId = messageId;

  try {
    for (const buf of buffers) {
      if (!speakingSet.has(messageId)) break;
      await new Promise<void>((resolve, reject) => {
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.connect(ctx.destination);
        currentSource = source;
        source.onended = () => resolve();
        source.addEventListener("error", () =>
          reject(new Error("Playback error")),
        );
        source.start();
      });
    }
  } finally {
    speakingSet.delete(messageId);
    currentSource = null;
    currentMessageId = null;
  }
}

export async function speakText(
  messageId: string,
  text: string,
  opts: { apiBaseUrl?: string; onPlaybackStart?: () => void } = {},
): Promise<void> {
  if (!opts.apiBaseUrl) return;

  let buffers = audioCache.get(messageId);
  if (!buffers) {
    const segments = await fetchTtsSegments(text, opts.apiBaseUrl);
    if (!segments.length) return;
    buffers = await decodeSegments(segments);
    audioCache.set(messageId, buffers);
  }

  opts.onPlaybackStart?.();
  await playBuffers(messageId, buffers);
}
