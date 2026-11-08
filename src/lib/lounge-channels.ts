export const LOUNGE_CHANNEL_IDS = ["general", "find-team", "help", "showcase"] as const;
export type LoungeChannel = typeof LOUNGE_CHANNEL_IDS[number];
export const LOUNGE_CHANNELS = [
  { id: "general", label: "General", description: "Say hello and talk about the event." },
  { id: "find-team", label: "Find a team", description: "Share your project, skills, and the role you need." },
  { id: "help", label: "Help", description: "Ask one specific question or offer a hand." },
  { id: "showcase", label: "Showcase", description: "Share what you made and ask for feedback." },
] as const;
export function isLoungeChannel(value: string): value is LoungeChannel {
  return (LOUNGE_CHANNEL_IDS as readonly string[]).includes(value);
}
