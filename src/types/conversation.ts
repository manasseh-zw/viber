export type ConversationRole = "user" | "assistant" | "system";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  timestamp: number;
  sandboxId?: string;
}

export interface ConversationEdit {
  id: string;
  prompt: string;
  files: string[];
  createdAt: number;
}

export interface ConversationState {
  conversationId: string;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
  edits: ConversationEdit[];
}
