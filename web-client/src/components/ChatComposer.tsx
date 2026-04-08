import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createVoiceRecorder } from "../lib/speechToText";
import "./ChatComposer.css";

export type SendMeta = { languageCode?: string | null };

interface Props {
  onSend: (text: string, meta?: SendMeta) => void;
  disabled?: boolean;
  /** FastAPI origin, e.g. http://127.0.0.1:8000 (from VITE_API_URL). Voice disabled if unset. */
  apiBaseUrl?: string;
}

export function ChatComposer({ onSend, disabled, apiBaseUrl }: Props) {
  const [value, setValue] = useState("");
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening" | "transcribing">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const voiceEnabled = Boolean(apiBaseUrl?.trim());

  const recorder = useMemo(() => {
    if (!apiBaseUrl?.trim()) return null;
    return createVoiceRecorder(apiBaseUrl.trim());
  }, [apiBaseUrl]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const toggleVoice = useCallback(async () => {
    if (!voiceEnabled || disabled || !recorder) return;
    setVoiceError(null);

    if (voicePhase === "idle") {
      try {
        await recorder.start();
        setVoicePhase("listening");
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Microphone permission denied");
      }
      return;
    }

    if (voicePhase === "listening") {
      setVoicePhase("transcribing");
      try {
        const { text, language } = await recorder.stop();
        setVoicePhase("idle");
        if (!text.trim()) {
          setVoiceError("No speech detected. Try again, a bit closer to the mic.");
          return;
        }
        onSend(text.trim(), { languageCode: language });
        setValue("");
        inputRef.current?.focus();
      } catch (err) {
        setVoicePhase("idle");
        setVoiceError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [disabled, onSend, recorder, voiceEnabled, voicePhase]);

  /** Must stay clickable while listening so the user can tap again to stop — only disable while transcribing. */
  const micDisabled = disabled || !voiceEnabled || voicePhase === "transcribing";
  const micLabel = voiceEnabled
    ? voicePhase === "listening"
      ? "Stop recording"
      : voicePhase === "transcribing"
        ? "Transcribing…"
        : "Start voice input"
    : "Voice unavailable";

  const statusTone: "ready" | "listening" | "busy" | "disabled" = !voiceEnabled
    ? "disabled"
    : disabled
      ? "busy"
      : voicePhase === "listening"
        ? "listening"
        : voicePhase === "transcribing"
          ? "busy"
          : "ready";

  const statusText = !voiceEnabled
    ? "Voice off — set VITE_API_URL to enable mic"
    : disabled
      ? "Assistant is responding…"
      : voicePhase === "listening"
        ? "Listening… tap mic to stop"
        : voicePhase === "transcribing"
          ? "Transcribing…"
          : "Ready — type a message or tap mic to speak";

  return (
    <div className="composer-stack">
      <div className={`composer-status composer-status--${statusTone}`} aria-live="polite">
        <span className="composer-status__dot" aria-hidden />
        <span className="composer-status__text">{statusText}</span>
        <span className="composer-status__keys" aria-hidden>
          Enter to send · Shift+Enter for new line
        </span>
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          ref={inputRef}
          className="composer__input"
          placeholder={voiceEnabled ? "Type a message… (or use the mic)" : "Type a message…"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />
        <motion.button
          type="button"
          className={`composer__mic${voicePhase === "listening" ? " composer__mic--hot" : ""}${voicePhase === "transcribing" ? " composer__mic--busy" : ""}`}
          disabled={micDisabled}
          onClick={toggleVoice}
          title={
            voiceEnabled ? micLabel : "Set VITE_API_URL in web-client/.env to enable voice (Sarvam STT)"
          }
          aria-label={voiceEnabled ? micLabel : "Voice unavailable"}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: voiceEnabled && !micDisabled ? 1.05 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
        <motion.button
          type="submit"
          className="composer__send"
          disabled={disabled || !value.trim()}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 19V5M12 5l-5 5M12 5l5 5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </form>
      {voiceError && <p className="composer__voice-err">{voiceError}</p>}
    </div>
  );
}
