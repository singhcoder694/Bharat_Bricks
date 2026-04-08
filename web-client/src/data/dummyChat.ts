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

const BOT_REPLIES: string[] = [
  "The Prevention of Sexual Harassment (POSH) Act, 2013 mandates that every workplace with 10 or more employees must constitute an Internal Complaints Committee (ICC). If you face harassment, you can file a written complaint within three months of the incident. The ICC must complete its inquiry within 90 days.\n\nSource: Sexual Harassment of Women at Workplace Act, 2013 — Sections 4, 9, and 11.",

  "Consent, under Indian law, means an unequivocal voluntary agreement communicated through words, gestures, or any form of verbal or non-verbal communication. Importantly, silence or lack of resistance does not imply consent. Section 375 of the Indian Penal Code (now BNS Section 63) lays this out clearly.\n\nRemember: consent can be withdrawn at any point.",

  "Several confidential helplines operate across India:\n\n• Women Helpline (Ministry of WCD): 181\n• National Commission for Women: 7827-170-170\n• iCall (TISS): 9152987821\n• Vandrevala Foundation: 1860-2662-345\n\nAll calls are confidential. You can also visit your nearest District Hospital for free reproductive health services under the National Health Mission.",

  "The Protection of Children from Sexual Offences (POCSO) Act, 2012 protects all children under 18 from sexual assault, harassment, and exploitation. Key features:\n\n• Gender-neutral protection\n• Mandatory reporting by anyone aware of an offence\n• Special courts for speedy trials\n• Child-friendly investigation and trial procedures\n\nSource: POCSO Act, 2012 — Sections 3–12.",

  "Reproductive health is a fundamental right recognized under Article 21 of the Indian Constitution. The Supreme Court in Suchita Srivastava v. Chandigarh Administration (2009) affirmed that reproductive choices — including contraception and safe termination — are part of the right to personal liberty.\n\nThe Medical Termination of Pregnancy (MTP) Act allows termination up to 24 weeks for certain categories with medical opinion.",

  "Menstrual health is an important but often stigmatized topic. Under the Swachh Bharat Mission and various state policies, subsidized sanitary products are available at Jan Aushadhi Kendras for as low as ₹1 per pad.\n\nTracking your cycle can help understand your body better. Irregularities lasting more than three months should be discussed with a healthcare provider — all consultations are confidential.",

  "If you or someone you know faces domestic violence, the Protection of Women from Domestic Violence Act, 2005 provides:\n\n• Right to reside in the shared household\n• Protection orders against the abuser\n• Monetary relief and compensation\n• Custody orders for children\n\nYou can approach a Protection Officer, file a Domestic Incident Report, or call 181 for immediate assistance.",
];

let replyIndex = 0;

export function getNextReply(): string {
  const reply = BOT_REPLIES[replyIndex % BOT_REPLIES.length];
  replyIndex++;
  return reply;
}

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
