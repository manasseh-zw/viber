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
      const previewUrl = this.buildPreviewUrl(preview.url, preview.token);
      this.sandboxInfo = {
        sandboxId: this.sandbox.id,
        url: previewUrl,
        provider: "daytona",
        createdAt: new Date(),
      };
      return true;
    } catch {
      return false;
    }
  }

  private buildPreviewUrl(baseUrl: string, token?: string): string {
    if (!token) return baseUrl;
    const url = new URL(baseUrl);
    url.searchParams.set("tkn", token);
    return url.toString();
  }

  async createSandbox(): Promise<SandboxInfo> {
    if (this.sandbox) {
      await this.terminate();
    }

    this.sandbox = await this.daytona.create({
      snapshot: SNAPSHOT_NAME,
      public: true,
    });

    const preview = await this.sandbox.getPreviewLink(DEV_PORT);
    const previewUrl = this.buildPreviewUrl(preview.url, preview.token);

    this.sandboxInfo = {
      sandboxId: this.sandbox.id,
      url: previewUrl,
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

    const excludePatterns = [
      "node_modules",
      ".git",
      "dist",
      "build",
      "bun.lock",
    ];

    const result = await this.sandbox.process.executeCommand(
      `find . -type f | grep -v -E '(node_modules|.git|dist|build|bun.lock)' | sed 's|^\\./||'`,
      directory
    );

    if (!result.result) return [];

    return result.result
      .split("\n")
      .filter((line) => line.trim() !== "")
      .filter((f) => !excludePatterns.some((pattern) => f.includes(pattern)));
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

    // Create src directory first
    await this.sandbox.process.executeCommand(
      `mkdir -p ${WORKING_DIR}/src`,
      WORKING_DIR
    );

    // Create the same files as E2B provider for consistency
    await this.writeFile(
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`
    );

    await this.writeFile(
      "src/index.tsx",
      `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
    );

    await this.writeFile(
      "src/App.tsx",
      `function App() {
  return (
    <div className="min-h-screen bg-white relative flex items-center justify-center text-gray-900 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64">
        <div className="absolute inset-x-16 -bottom-24 h-64 rounded-full bg-gradient-to-t from-[#F57119] via-[#FF5C06] to-white blur-3xl opacity-80" />
      </div>

      <div className="relative text-center space-y-3">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#18273C] font-semibold">
          Workspace ready
        </p>
        <h1 className="text-3xl sm:text-4xl font-normal text-gray-800">
          Ready to build
        </h1>
        <p className="text-sm sm:text-base text-gray-600 italic max-w-xs mx-auto">
          You can start describing what you want to create.
        </p>
      </div>
    </div>
  )
}

export default App`
    );

    await this.writeFile(
      "src/index.css",
      `@import "tailwindcss";

@layer base {
  body {
    font-family: "Lora", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #ffffff;
  }
}`
    );

    // Start Bun dev server
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
