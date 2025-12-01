export interface SandboxFile {
  path: string;
  content: string;
  lastModified?: number;
}

export interface SandboxInfo {
  sandboxId: string;
  url: string;
  provider: "e2b";
  createdAt: Date;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface SandboxProviderConfig {
  e2b?: {
    apiKey: string;
    timeoutMs?: number;
    template?: string;
  };
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

export abstract class SandboxProvider {
  protected config: SandboxProviderConfig;
  protected sandbox: unknown;
  protected sandboxInfo: SandboxInfo | null = null;

  constructor(config: SandboxProviderConfig) {
    this.config = config;
  }

  abstract createSandbox(): Promise<SandboxInfo>;
  abstract runCommand(command: string): Promise<CommandResult>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract listFiles(directory?: string): Promise<string[]>;
  abstract installPackages(packages: string[]): Promise<CommandResult>;
  abstract getSandboxUrl(): string | null;
  abstract getSandboxInfo(): SandboxInfo | null;
  abstract terminate(): Promise<void>;
  abstract isAlive(): boolean;

  async setupViteApp(): Promise<void> {
    throw new Error("setupViteApp not implemented for this provider");
  }

  async restartViteServer(): Promise<void> {
    throw new Error("restartViteServer not implemented for this provider");
  }
}

declare global {
  // eslint-disable-next-line no-var
  var activeSandbox: unknown;
  // eslint-disable-next-line no-var
  var sandboxState: SandboxState;
  // eslint-disable-next-line no-var
  var existingFiles: Set<string>;
}

