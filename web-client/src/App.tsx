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
import {
  WELCOME_MESSAGE,
  getNextReply,
  makeId,
  type ChatMessage,
} from "./data/dummyChat";
import "./App.css";

const TYPING_DELAY = 1200;

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const handleNewChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setShowSuggestions(true);
    setTyping(false);
  }, []);

  const handleSend = useCallback((text: string) => {
    setShowSuggestions(false);
    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: getNextReply(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, TYPING_DELAY);
  }, []);

  return (
    <div className="app-root">
      <div className="app-layout">
        <AppAside onNewChat={handleNewChat} />

        <div className="app-chat-column">
          <ChatHeader onMenuClick={() => setDrawerOpen(true)} />

          <div className="chat-main">
            <main className="chat-messages">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              <SuggestedPrompts onPick={handleSend} visible={showSuggestions} />

              <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>

              <div ref={bottomRef} />
            </main>

            <div className="composer-wrap">
              <ChatComposer onSend={handleSend} disabled={typing} />
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
