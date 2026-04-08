import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarPanel } from "./SidebarPanel";
import "./WebDrawer.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export function WebDrawer({ open, onClose, onNewChat }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence mode="sync">
      {open && (
        <>
          <motion.button
            key="drawer-bg"
            type="button"
            className="web-drawer__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-label="Close menu"
          />
          <motion.div
            key="drawer-panel"
            className="web-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ x: "-105%" }}
            animate={{ x: 0 }}
            exit={{ x: "-105%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="web-drawer__head">
              <span className="web-drawer__head-title">Menu</span>
              <button type="button" className="web-drawer__close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="web-drawer__scroll">
              <SidebarPanel onNewChat={onNewChat} onSessionPick={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
