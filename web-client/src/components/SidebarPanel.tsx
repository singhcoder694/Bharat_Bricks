import "./SidebarPanel.css";

interface Props {
  className?: string;
  onNewChat: () => void;
  onSessionPick?: () => void;
}

export function SidebarPanel({ className = "", onNewChat, onSessionPick }: Props) {
  return (
    <div className={`sidebar-panel ${className}`.trim()}>
      <div className="sidebar-panel__header">
        <div className="sidebar-panel__logo-ring">
          <div className="sidebar-panel__logo">?</div>
        </div>
        <h2 className="sidebar-panel__title">Tritiya AI</h2>
        <p className="sidebar-panel__subtitle">Privacy-first companion</p>
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

      <div className="sidebar-panel__content">
        <p className="sidebar-panel__section">Quick tips</p>
        <div className="sidebar-panel__card">
          <ul className="sidebar-panel__tips">
            <li>Use the mic in the chat bar to speak. Tap again to send.</li>
            <li>Tap the speaker icon on replies to listen.</li>
            <li>Conversations aren’t saved in the sidebar.</li>
          </ul>
        </div>

        <p className="sidebar-panel__section sidebar-panel__section--spaced">Privacy</p>
        <div className="sidebar-panel__card sidebar-panel__card--muted">
          <p className="sidebar-panel__blurb">
            Tritiya AI is a privacy-first assistant for sexual health education, rights awareness, and
            well-being — built for India.
          </p>
        </div>
      </div>

      <footer className="sidebar-panel__footer">
        <div className="sidebar-panel__footer-inner">
          <div className="sidebar-panel__footer-meta">
            <span className="sidebar-panel__copyright">
              © {new Date().getFullYear()} Tritiya AI
            </span>
            <span className="sidebar-panel__dot" aria-hidden>
              ·
            </span>
            <span className="sidebar-panel__rights">All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
