export interface SandboxFile {
  path: string;
  content: string;
  lastModified?: number;
}

export interface SandboxInfo {
  sandboxId: string;
  url: string;
  createdAt: Date;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface SandboxFileCache {
  files: Record<string, SandboxFile>;
  lastSync: number;
  sandboxId: string;
  manifest?: unknown;
}

export interface SandboxState {
  fileCache: SandboxFileCache | null;
  sandbox: unknown;
  sandboxData: {
    sandboxId: string;
    url: string;
  } | null;
}

declare global {
  // eslint-disable-next-line no-var
  var activeSandbox: unknown;
  // eslint-disable-next-line no-var
  var sandboxState: SandboxState;
  // eslint-disable-next-line no-var
  var existingFiles: Set<string>;
}
