export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  date: string;
  messageCount: number;
}

export const PREVIOUS_SESSIONS: ChatSession[] = [
  {
    id: "s1",
    title: "POSH Act rights",
    preview: "What are my rights under the POSH Act?",
    date: "Today",
    messageCount: 4,
  },
  {
    id: "s2",
    title: "Consent & Indian law",
    preview: "How does consent work under Indian law?",
    date: "Yesterday",
    messageCount: 6,
  },
  {
    id: "s3",
    title: "Helplines & support",
    preview: "Where can I find confidential health support?",
    date: "Apr 5",
    messageCount: 3,
  },
  {
    id: "s4",
    title: "POCSO Act overview",
    preview: "What is the POCSO Act?",
    date: "Apr 3",
    messageCount: 5,
  },
  {
    id: "s5",
    title: "Reproductive rights",
    preview: "Is reproductive health a legal right in India?",
    date: "Mar 28",
    messageCount: 7,
  },
];

export interface Language {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
];
