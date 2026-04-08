import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "../data/dummyChat";
import {
  cancelSpeechIfMessage,
  canUseTts,
  isMessageSpeaking,
  speakText,
  unlockAudio,
} from "../lib/textToSpeech";
import "./MessageBubble.css";

interface Props {
  message: ChatMessage;
  /** Same FastAPI origin as chat/STT — enables Sarvam cloud TTS (natural Indian accents). */
  apiBaseUrl?: string;
}

const variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function renderInlineBold(text: string): React.ReactNode[] {
  // Minimal formatting: convert **bold** to <strong>. Leaves unmatched ** as-is.
  const out: React.ReactNode[] = [];
  const parts = text.split("**");
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];
    const key = `${i}-${chunk.length}`;
    if (i % 2 === 1) out.push(<strong key={key}>{chunk}</strong>);
    else out.push(<span key={key}>{chunk}</span>);
  }
  return out;
}

function renderMessageText(text: string): React.ReactNode {
  // Preserve newlines, apply inline bold per line to keep keys stable.
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={`${i}-${line.length}`}>
          {renderInlineBold(line)}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 4a8 8 0 0 1 7.75 6h-2.1A6 6 0 0 0 12 6V4z" />
    </svg>
  );
}

export function MessageBubble({ message, apiBaseUrl }: Props) {
  const isUser = message.role === "user";
  const ttsAvailable = useMemo(() => canUseTts(apiBaseUrl), [apiBaseUrl]);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");

  useEffect(() => {
    return () => {
      cancelSpeechIfMessage(message.id);
    };
  }, [message.id]);

  const toggleListen = useCallback(async () => {
    if (!ttsAvailable) return;
    if (phase !== "idle" || isMessageSpeaking(message.id)) {
      cancelSpeechIfMessage(message.id);
      setPhase("idle");
      return;
    }
    // Unlock audio playback immediately on user gesture (helps Safari/Chrome policies).
    await unlockAudio();
    setPhase("loading");
    try {
      await speakText(message.id, message.text, {
        apiBaseUrl,
        onPlaybackStart: () => setPhase("playing"),
      });
    } finally {
      setPhase("idle");
    }
  }, [message.id, message.text, ttsAvailable, apiBaseUrl, phase]);

  return (
    <motion.div
      className={`bubble-row ${isUser ? "bubble-row--user" : "bubble-row--bot"}`}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      {!isUser && (
        <div className="bubble-avatar">
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="2.5" />
            <path
              d="M9 14.5C9 11.46 11.46 9 14.5 9h0c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2h-1c-1.1 0-2 .9-2 2v1.5"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="12.5" cy="19.5" r="1.25" fill="var(--accent)" />
          </svg>
        </div>
      )}
      {isUser ? (
        <div className="bubble bubble--user">
          <p className="bubble__text">{renderMessageText(message.text)}</p>
        </div>
      ) : (
        <div className="bubble-with-actions">
          <div className="bubble bubble--bot">
            <p className="bubble__text">{renderMessageText(message.text)}</p>
          </div>
          {ttsAvailable && (
            <div className="bubble-tts-wrap">
              <button
                type="button"
                className={`bubble-tts ${phase !== "idle" ? "bubble-tts--active" : ""}${phase === "loading" ? " bubble-tts--loading" : ""}`}
                onClick={toggleListen}
                title={phase === "idle" ? "Listen" : phase === "loading" ? "Generating voice…" : "Stop"}
                aria-label={
                  phase === "idle"
                    ? "Listen to this response"
                    : phase === "loading"
                      ? "Generating voice, tap to cancel"
                      : "Stop reading aloud"
                }
                aria-pressed={phase !== "idle"}
                aria-busy={phase === "loading"}
              >
                {phase === "idle" ? <SpeakerIcon /> : phase === "loading" ? <SpinnerIcon /> : <StopIcon />}
              </button>
              <span
                className={`bubble-tts-hint${phase === "loading" ? " bubble-tts-hint--show" : ""}`}
              >
                Generating voice…
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
