import { motion } from "framer-motion";
import { SUGGESTED_PROMPTS } from "../data/dummyChat";
import "./SuggestedPrompts.css";

interface Props {
  onPick: (text: string) => void;
  visible: boolean;
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
};

const chip = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function SuggestedPrompts({ onPick, visible }: Props) {
  if (!visible) return null;

  return (
    <motion.div
      className="prompts"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <p className="prompts__label">Try asking</p>
      <div className="prompts__chips">
        {SUGGESTED_PROMPTS.map((text) => (
          <motion.button
            key={text}
            type="button"
            className="prompts__chip"
            variants={chip}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(text)}
          >
            {text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
