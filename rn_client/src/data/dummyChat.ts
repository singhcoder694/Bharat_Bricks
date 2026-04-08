import type { ChatMessage } from "../lib/types";

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I'm Tritiya AI. This is a private, non-judgmental space to talk about gender identity, sexuality, relationships, and LGBTQ+ experiences.\n\nYou can share as little or as much as you want. I don't store chat history.\n\nIf you're in immediate danger or thinking about self-harm, please reach out right now: iCall (India) 9152987821 · Vandrevala Foundation 1860-2662-345 · The Trevor Project (US) 1-866-488-7386.",
  timestamp: Date.now(),
};

export const SUGGESTED_PROMPTS = [
  "I think I might be queer — how do I figure out what I'm feeling?",
  "How do I come out safely to my family in India?",
  "I'm confused about my gender — can you help me explore it gently?",
  "How do I set boundaries in a relationship without feeling guilty?",
];

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
