import { SidebarPanel } from "./SidebarPanel";
import "./AppAside.css";

interface Props {
  onNewChat: () => void;
}

export function AppAside({ onNewChat }: Props) {
  return (
    <aside className="app-aside" aria-label="Conversations and settings">
      <div className="app-aside__inner">
        <SidebarPanel onNewChat={onNewChat} />
      </div>
    </aside>
  );
}
