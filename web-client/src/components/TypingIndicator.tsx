import { motion } from "framer-motion";
import "./TypingIndicator.css";

const dotTransition = (delay: number) => ({
  y: { repeat: Infinity, repeatType: "reverse" as const, duration: 0.4, ease: "easeInOut" as const, delay },
});

export function TypingIndicator() {
  return (
    <motion.div
      className="typing-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="typing-avatar">
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
      <div className="typing-bubble">
        {[0, 0.15, 0.3].map((d) => (
          <motion.span
            key={d}
            className="typing-dot"
            animate={{ y: [0, -5, 0] }}
            transition={dotTransition(d)}
          />
        ))}
      </div>
    </motion.div>
  );
}
