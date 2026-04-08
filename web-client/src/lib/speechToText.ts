/**
 * Browser mic → POST multipart → transcribed text via Sarvam AI STT.
 * TypeScript port of app/voice_transcription/client_snippet.js.
 */

const REQUEST_TIMEOUT_MS = 120_000;
const RECORD_SLICE_MS = 500;

type TranscribeResult = { text: string; language: string | null };

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
      return m;
  }
  return "";
}

export function createVoiceRecorder(apiBaseUrl: string) {
  const transcribeUrl = `${apiBaseUrl.replace(/\/$/, "")}/transcribe`;

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let mime = "audio/webm";

  return {
    async start(): Promise<void> {
      chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mime = pickMime();
      const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {};
      recorder = new MediaRecorder(stream, opts);
      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) chunks.push(ev.data);
      };
      recorder.start(RECORD_SLICE_MS);
    },

    async stop(): Promise<TranscribeResult> {
      if (!recorder || recorder.state === "inactive") {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        return { text: "", language: null };
      }

      const rec = recorder;
      const blobType = rec.mimeType || mime || "audio/webm";
      const s = stream;

      return new Promise<TranscribeResult>((resolve, reject) => {
        rec.onstop = async () => {
          s?.getTracks().forEach((t) => t.stop());
          stream = null;
          recorder = null;

          const blob = new Blob(chunks, { type: blobType });
          chunks = [];

          if (blob.size < 64) {
            resolve({ text: "", language: null });
            return;
          }

          const ac = new AbortController();
          const tid = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);

          try {
            const fd = new FormData();
            fd.append("file", blob, "speech.webm");

            const res = await fetch(transcribeUrl, {
              method: "POST",
              body: fd,
              signal: ac.signal,
            });

            const data: Record<string, unknown> = await res
              .json()
              .catch(() => ({}));

            if (!res.ok) {
              const msg =
                typeof data.detail === "string"
                  ? data.detail
                  : JSON.stringify(data.detail || res.statusText);
              reject(new Error(msg || "Transcription failed"));
              return;
            }

            resolve({
              text: (String(data.text ?? "")).trim(),
              language: (data.language as string) || null,
            });
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") {
              reject(
                new Error(
                  "Transcription timed out. Keep clips under ~30 s.",
                ),
              );
            } else {
              reject(e);
            }
          } finally {
            clearTimeout(tid);
          }
        };

        rec.stop();
      });
    },
  };
}
