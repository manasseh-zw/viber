import { Daytona, Sandbox } from "@daytonaio/sdk";
import { appEnv } from "../env/env.server";
import { appConfig } from "../config";
import type {
  SandboxInfo,
  CommandResult,
  SandboxProviderConfig,
} from "./types";
import { SandboxProvider } from "./types";

const SNAPSHOT_NAME = appConfig.daytona.snapshotName;
const WORKING_DIR = appConfig.daytona.workingDirectory;
const DEV_PORT = appConfig.daytona.devPort;
const DEV_SESSION_ID = "bun-dev-server";

export class DaytonaProvider extends SandboxProvider {
  private daytona: Daytona;
  protected override sandbox: Sandbox | null = null;

  constructor(config: SandboxProviderConfig = {}) {
    super(config);
    this.daytona = new Daytona({
      apiKey: config.apiKey || appEnv.DAYTONA_API_KEY,
    });
  }

  async reconnect(sandboxId: string): Promise<boolean> {
    try {
      this.sandbox = await this.daytona.get(sandboxId);
      const preview = await this.sandbox.getPreviewLink(DEV_PORT);
      this.sandboxInfo = {
        sandboxId: this.sandbox.id,
        url: preview.url,
        provider: "daytona",
        createdAt: new Date(),
      };
      return true;
    } catch {
      return false;
    }
  }

  async createSandbox(): Promise<SandboxInfo> {
    if (this.sandbox) {
      await this.terminate();
    }

    this.sandbox = await this.daytona.create({
      snapshot: SNAPSHOT_NAME,
    });

    const preview = await this.sandbox.getPreviewLink(DEV_PORT);

    this.sandboxInfo = {
      sandboxId: this.sandbox.id,
      url: preview.url,
      provider: "daytona",
      createdAt: new Date(),
    };

    return this.sandboxInfo;
  }

  async runCommand(command: string): Promise<CommandResult> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    const result = await this.sandbox.process.executeCommand(
      command,
      WORKING_DIR
    );

    return {
      stdout: result.result || "",
      stderr: "",
      exitCode: result.exitCode,
      success: result.exitCode === 0,
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    const fullPath = path.startsWith("/") ? path : `${WORKING_DIR}/${path}`;
    await this.sandbox.fs.uploadFile(Buffer.from(content), fullPath);
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    const fullPath = path.startsWith("/") ? path : `${WORKING_DIR}/${path}`;
    const content = await this.sandbox.fs.downloadFile(fullPath);
    return content.toString();
  }

  async listFiles(directory: string = WORKING_DIR): Promise<string[]> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    const files = await this.sandbox.fs.listFiles(directory);
    const excludePatterns = ["node_modules", ".git", "dist", "build"];

    return files
      .filter(
        (f) => !excludePatterns.some((pattern) => f.name.includes(pattern))
      )
      .map((f) => f.name);
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    const command = `bun add ${packages.join(" ")}`;
    const result = await this.runCommand(command);

    if (result.success && appConfig.packages.autoRestartVite) {
      await this.restartViteServer();
    }

    return result;
  }

  async setupViteApp(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    await this.sandbox.process.createSession(DEV_SESSION_ID);

    await this.sandbox.process.executeSessionCommand(DEV_SESSION_ID, {
      command: "bun run dev",
      runAsync: true,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, appConfig.daytona.devStartupDelay)
    );
  }

  async restartViteServer(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("No active sandbox");
    }

    try {
      await this.sandbox.process.deleteSession(DEV_SESSION_ID);
    } catch {
      // Session might not exist
    }

    await this.sandbox.process.createSession(DEV_SESSION_ID);

    await this.sandbox.process.executeSessionCommand(DEV_SESSION_ID, {
      command: "bun run dev",
      runAsync: true,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, appConfig.daytona.devRestartDelay)
    );
  }

  getSandboxUrl(): string | null {
    return this.sandboxInfo?.url || null;
  }

  getSandboxInfo(): SandboxInfo | null {
    return this.sandboxInfo;
  }

  async terminate(): Promise<void> {
    if (this.sandbox) {
      try {
        await this.sandbox.delete();
      } catch (e) {
        console.error("Failed to terminate sandbox:", e);
      }
      this.sandbox = null;
      this.sandboxInfo = null;
    }
  }

  isAlive(): boolean {
    return !!this.sandbox;
  }
}
