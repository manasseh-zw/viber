export type ConversationRole = "user" | "assistant" | "system";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  timestamp: number;
  metadata?: {
    editedFiles?: string[];
    addedPackages?: string[];
    editType?: string;
    sandboxId?: string;
  };
}

export interface ConversationEdit {
  timestamp: number;
  userRequest: string;
  editType: string;
  targetFiles: string[];
  confidence: number;
  outcome: "success" | "partial" | "failed";
  errorMessage?: string;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  edits: ConversationEdit[];
  currentTopic?: string;
  projectEvolution: {
    initialState?: string;
    majorChanges: Array<{
      timestamp: number;
      description: string;
      filesAffected: string[];
    }>;
  };
  userPreferences: {
    editStyle?: "targeted" | "comprehensive";
    commonRequests?: string[];
    packagePreferences?: string[];
  };
}

export interface ConversationState {
  conversationId: string;
  startedAt: number;
  lastUpdated: number;
  context: ConversationContext;
}

