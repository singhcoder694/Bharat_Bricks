import { useState } from "react";
import { LANGUAGES, PREVIOUS_SESSIONS } from "../data/dummySessions";
import "./SidebarPanel.css";

interface Props {
  className?: string;
  onNewChat: () => void;
  onSessionPick?: () => void;
}

export function SidebarPanel({ className = "", onNewChat, onSessionPick }: Props) {
  const [selectedLang, setSelectedLang] = useState("en");

  return (
    <div className={`sidebar-panel ${className}`.trim()}>
      <div className="sidebar-panel__header">
        <div className="sidebar-panel__logo-ring">
          <div className="sidebar-panel__logo">?</div>
        </div>
        <h2 className="sidebar-panel__title">Tritiya AI</h2>
        <p className="sidebar-panel__subtitle">Your conversations</p>
      </div>

      <button
        type="button"
        className="sidebar-panel__new"
        onClick={() => {
          onNewChat();
          onSessionPick?.();
        }}
      >
        <span className="sidebar-panel__new-plus">+</span>
        New conversation
      </button>

      <p className="sidebar-panel__section">Recent</p>
      <ul className="sidebar-panel__sessions">
        {PREVIOUS_SESSIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="sidebar-panel__session"
              onClick={() => onSessionPick?.()}
            >
              <span className="sidebar-panel__session-dot" />
              <span className="sidebar-panel__session-body">
                <span className="sidebar-panel__session-title">{s.title}</span>
                <span className="sidebar-panel__session-preview">{s.preview}</span>
              </span>
              <span className="sidebar-panel__session-meta">
                <span>{s.date}</span>
                <span>{s.messageCount} msgs</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="sidebar-panel__section sidebar-panel__section--spaced">Language</p>
      <div className="sidebar-panel__langs">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`sidebar-panel__lang ${selectedLang === lang.code ? "sidebar-panel__lang--active" : ""}`}
            onClick={() => setSelectedLang(lang.code)}
          >
            <span className="sidebar-panel__lang-native">{lang.native}</span>
            <span className="sidebar-panel__lang-label">{lang.label}</span>
          </button>
        ))}
      </div>

      <footer className="sidebar-panel__footer">
        <p>
          Tritiya AI is a privacy-first assistant for sexual health education,
          rights awareness, and well-being — built for India.
        </p>
        <div className="sidebar-panel__footer-rule" />
        <p className="sidebar-panel__copyright">
          © {new Date().getFullYear()} Tritiya AI · All rights reserved
        </p>
        <p className="sidebar-panel__version">v1.0.0</p>
      </footer>
    </div>
  );
}
