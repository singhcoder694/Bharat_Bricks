/**
 * Minimal browser helper: record mic → POST multipart → returns transcribed text.
 * Copy into your frontend. Set API_BASE to your API origin if the page is on another domain.
 *
 * Requires: HTTPS or localhost (getUserMedia), and server CORS if cross-origin.
 * Backend: Sarvam AI (see voice_api.py) — set SARVAM_API_KEY on the server.
 */
const VOICE_API = {
  /** e.g. "/transcribe" for same origin, or full URL if API is on another host */
  transcribePath: "/transcribe",
  get transcribeUrl() {
    if (typeof window === "undefined") return this.transcribePath;
    const u = new URL(this.transcribePath, window.location.origin);
    return u.toString();
  },
  /** ms; first model download can take several minutes */
  requestTimeoutMs: 360000,
  /** MediaRecorder timeslice ms */
  recordSliceMs: 500,
};

function pickRecorderMime() {
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

/**
 * Returns { start(), stop() } — call start() then stop() when done.
 * stop() resolves to { text, language } or throws.
 *
 * Plain script tag: this file assigns window.createVoiceRecorder.
 * ES modules: import { createVoiceRecorder, VOICE_API } from './client_snippet.js'
 */
function createVoiceRecorder() {
  let stream = null;
  let recorder = null;
  let chunks = [];
  let mime = "audio/webm";

  return {
    async start() {
      chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mime = pickRecorderMime();
      const opts = mime ? { mimeType: mime } : {};
      recorder = new MediaRecorder(stream, opts);
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      recorder.start(VOICE_API.recordSliceMs);
    },

    async stop() {
      if (!recorder || recorder.state === "inactive") {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        stream = null;
        return { text: "", language: null };
      }

      const rec = recorder;
      const blobType = rec.mimeType || mime || "audio/webm";
      const s = stream;

      return await new Promise((resolve, reject) => {
        rec.onstop = async () => {
          if (s) s.getTracks().forEach((t) => t.stop());
          stream = null;
          recorder = null;
          const blob = new Blob(chunks, { type: blobType });
          chunks = [];
          if (blob.size < 64) {
            resolve({ text: "", language: null });
            return;
          }
          const ac = new AbortController();
          const tid = setTimeout(() => ac.abort(), VOICE_API.requestTimeoutMs);
          try {
            const fd = new FormData();
            fd.append("file", blob, "speech.webm");
            const r = await fetch(VOICE_API.transcribeUrl, {
              method: "POST",
              body: fd,
              signal: ac.signal,
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
              const msg =
                typeof data.detail === "string"
                  ? data.detail
                  : JSON.stringify(data.detail || r.statusText);
              reject(new Error(msg || "Transcription failed"));
              return;
            }
            resolve({
              text: (data.text || "").trim(),
              language: data.language || null,
            });
          } catch (e) {
            if (e.name === "AbortError") {
              reject(
                new Error(
                  "Transcription timed out. Check SARVAM_API_KEY and keep clips under ~30s (Sarvam REST)."
                )
              );
            } else reject(e);
          } finally {
            clearTimeout(tid);
          }
        };
        rec.stop();
      });
    },
  };
}

if (typeof window !== "undefined") {
  window.VOICE_API = VOICE_API;
  window.createVoiceRecorder = createVoiceRecorder;
}
