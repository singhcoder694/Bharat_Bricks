import { motion } from "framer-motion";
import "./ChatHeader.css";

interface Props {
  onMenuClick: () => void;
}

export function ChatHeader({ onMenuClick }: Props) {
  return (
    <motion.header
      className="chat-header"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chat-header__bar">
        <div className="chat-header__start">
          <button
            type="button"
            className="chat-header__menu"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <span className="chat-header__menu-bar" />
            <span className="chat-header__menu-bar chat-header__menu-bar--short" />
            <span className="chat-header__menu-bar" />
          </button>

          <div className="chat-header__brand">
            <div className="chat-header__icon-ring">
              <div className="chat-header__icon">
                <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden>
                  <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="2" />
                  <path
                    d="M9 14.5C9 11.46 11.46 9 14.5 9h0c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2h-1c-1.1 0-2 .9-2 2v1.5"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="12.5" cy="19.5" r="1.25" fill="var(--accent)" />
                </svg>
              </div>
            </div>
            <div className="chat-header__titles">
              <h1 className="chat-header__title">Tritiya AI</h1>
              <p className="chat-header__sub">Private &middot; Encrypted &middot; Anonymous</p>
            </div>
          </div>
        </div>

        <div className="chat-header__end">
          <span className="chat-header__meta">Educational · Privacy-first</span>
        </div>
      </div>
    </motion.header>
  );
}
