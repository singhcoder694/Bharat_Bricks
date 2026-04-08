export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi there! I'm Tritiya AI — your private, safe space for questions about sexual health, rights, and well-being. Everything here stays confidential. Ask me anything you'd like to understand better.",
  timestamp: Date.now(),
};

export const SUGGESTED_PROMPTS = [
  "What are my rights under the POSH Act?",
  "How does consent work in Indian law?",
  "Where can I find confidential health support?",
  "What is the POCSO Act?",
];

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
