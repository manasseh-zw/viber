import type { EditType } from "./files";

export interface GenerateCodeRequest {
  prompt: string;
  isEdit: boolean;
  sandboxId: string;
  conversationId?: string;
  context?: {
    files?: Record<string, string>;
    manifest?: unknown;
    recentMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  files: GeneratedFile[];
  packages: string[];
  error?: string;
}

export interface ApplyCodeRequest {
  sandboxId: string;
  files: GeneratedFile[];
  packages?: string[];
}

export interface ApplyCodeResponse {
  success: boolean;
  appliedFiles: string[];
  installedPackages: string[];
  error?: string;
}

export type StreamEventType =
  | "status"
  | "stream"
  | "component"
  | "file"
  | "package"
  | "error"
  | "complete";

export interface StreamEvent {
  type: StreamEventType;
  message?: string;
  data?: unknown;
}

export interface StatusStreamEvent extends StreamEvent {
  type: "status";
  message: string;
}

export interface StreamChunkEvent extends StreamEvent {
  type: "stream";
  data: {
    content: string;
    index: number;
  };
}

export interface FileStreamEvent extends StreamEvent {
  type: "file";
  data: {
    path: string;
    content: string;
  };
}

export interface PackageStreamEvent extends StreamEvent {
  type: "package";
  data: {
    name: string;
  };
}

export interface ErrorStreamEvent extends StreamEvent {
  type: "error";
  message: string;
  data?: {
    code?: string;
    details?: string;
  };
}

export interface CompleteStreamEvent extends StreamEvent {
  type: "complete";
  data: {
    files: GeneratedFile[];
    packages: string[];
    editType?: EditType;
  };
}

export type AnyStreamEvent =
  | StatusStreamEvent
  | StreamChunkEvent
  | FileStreamEvent
  | PackageStreamEvent
  | ErrorStreamEvent
  | CompleteStreamEvent;

export interface AIServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

