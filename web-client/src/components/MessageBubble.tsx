import { motion } from "framer-motion";
import type { ChatMessage } from "../data/dummyChat";
import "./MessageBubble.css";

interface Props {
  message: ChatMessage;
}

const variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

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
      <div className={`bubble ${isUser ? "bubble--user" : "bubble--bot"}`}>
        <p className="bubble__text">{message.text}</p>
      </div>
    </motion.div>
  );
}
