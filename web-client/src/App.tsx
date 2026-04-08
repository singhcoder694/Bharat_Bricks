import { useCallback, useRef, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { AppAside } from "./components/AppAside";
import { WebDrawer } from "./components/WebDrawer";
import { ChatHeader } from "./components/ChatHeader";
import { MessageBubble } from "./components/MessageBubble";
import { TypingIndicator } from "./components/TypingIndicator";
import { ChatComposer } from "./components/ChatComposer";
import { SuggestedPrompts } from "./components/SuggestedPrompts";
import { Disclaimer } from "./components/Disclaimer";
import { WELCOME_MESSAGE, makeId, type ChatMessage } from "./data/dummyChat";
import { sendChatMessage } from "./lib/agentChat";
import { prefetchTts } from "./lib/textToSpeech";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL?.trim() ?? "";

function newSessionId(): string {
  return crypto.randomUUID();
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(newSessionId());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  /** Warm TTS for the welcome bubble so first tap is faster. */
  useEffect(() => {
    if (API_BASE) prefetchTts(WELCOME_MESSAGE.id, WELCOME_MESSAGE.text, API_BASE);
  }, [API_BASE]);

  const handleNewChat = useCallback(() => {
    sessionIdRef.current = newSessionId();
    setMessages([WELCOME_MESSAGE]);
    setShowSuggestions(true);
    setTyping(false);
  }, []);

  const handleSend = useCallback(
    async (text: string, meta?: { languageCode?: string | null }) => {
      setShowSuggestions(false);
      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      if (!API_BASE) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            text: "To use the companion agent, set `VITE_API_URL` in `web-client/.env` to your FastAPI app URL (for example `http://127.0.0.1:8000`), then restart the Vite dev server. The same server powers voice transcription.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      setTyping(true);
      try {
        const { response } = await sendChatMessage(
          API_BASE,
          sessionIdRef.current,
          text,
          meta?.languageCode,
        );
        const botMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: response,
          timestamp: Date.now(),
        };
        prefetchTts(botMsg.id, botMsg.text, API_BASE);
        setMessages((prev) => [...prev, botMsg]);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            text: `Sorry, something went wrong: ${detail}`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [],
  );

  return (
    <div className="app-root">
      <div className="app-layout">
        <AppAside onNewChat={handleNewChat} />

        <div className="app-chat-column">
          <ChatHeader onMenuClick={() => setDrawerOpen(true)} />

          <div className="chat-main">
            <main className="chat-messages">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} apiBaseUrl={API_BASE || undefined} />
              ))}

              <SuggestedPrompts onPick={handleSend} visible={showSuggestions} />

              <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>

              <div ref={bottomRef} />
            </main>

            <div className="composer-wrap">
              <ChatComposer
                onSend={handleSend}
                disabled={typing}
                apiBaseUrl={API_BASE || undefined}
              />
              <Disclaimer />
            </div>
          </div>
        </div>
      </div>

      <WebDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNewChat={handleNewChat}
      />
    </div>
  );
}

export default App;
