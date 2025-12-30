import { sandboxManager } from "./manager";
import { createSandbox } from "./factory";
import type { SandboxInfo, SandboxFile } from "../types/sandbox";

export interface CreateSandboxResult {
  success: boolean;
  sandboxId?: string;
  url?: string;
  error?: string;
}

export interface SandboxFilesResult {
  success: boolean;
  files?: Record<string, string>;
  error?: string;
}

export interface SandboxStatusResult {
  success: boolean;
  isAlive?: boolean;
  sandboxId?: string;
  url?: string;
  error?: string;
}

export async function createNewSandbox(): Promise<CreateSandboxResult> {
  try {
    await sandboxManager.terminateAll();

    const sandbox = createSandbox();
    const info: SandboxInfo = await sandbox.create();
    await sandbox.setupApp();

    sandboxManager.register(info.sandboxId, sandbox);

    return {
      success: true,
      sandboxId: info.sandboxId,
      url: info.url,
    };
  } catch (error) {
    console.error("Error creating sandbox:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSandboxFileList(
  sandboxId?: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    const fileList = await sandbox.files();
    return { success: true, files: fileList };
  } catch (error) {
    console.error("Error getting sandbox file list:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSandboxFileContents(
  filePaths: string[],
  sandboxId?: string
): Promise<SandboxFilesResult> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    const fileContents: Record<string, string> = {};

    await Promise.all(
      filePaths.map(async (file) => {
        try {
          fileContents[file] = await sandbox.read(file);
        } catch {
          // Skip unreadable files
        }
      })
    );

    return { success: true, files: fileContents };
  } catch (error) {
    console.error("Error getting sandbox file contents:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSandboxFiles(
  sandboxId?: string
): Promise<SandboxFilesResult> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    const fileList = await sandbox.files();
    const fileContents: Record<string, string> = {};

    await Promise.all(
      fileList.map(async (file) => {
        try {
          fileContents[file] = await sandbox.read(file);
        } catch {
          // Skip unreadable files
        }
      })
    );

    return { success: true, files: fileContents };
  } catch (error) {
    console.error("Error getting sandbox files:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSandboxStatus(
  sandboxId?: string
): Promise<SandboxStatusResult> {
  try {
    const id = sandboxId || sandboxManager.getActiveSandboxId();
    if (!id) {
      return { success: false, error: "No active sandbox" };
    }

    const sandbox = sandboxManager.get(id);
    if (!sandbox) {
      return { success: false, error: "Sandbox not found" };
    }

    const info = sandbox.getInfo();
    return {
      success: true,
      isAlive: sandbox.isActive(),
      sandboxId: id,
      url: info?.url,
    };
  } catch (error) {
    console.error("Error getting sandbox status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function applyFilesToSandbox(
  files: SandboxFile[],
  sandboxId?: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ success: boolean; appliedFiles: string[]; error?: string }> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, appliedFiles: [], error: "No active sandbox" };
    }

    const appliedFiles: string[] = [];

    console.log(
      `[applyFilesToSandbox] Writing ${files.length} file(s) directly`
    );

    await Promise.all(
      files.map(async (file, index) => {
        onProgress?.(index + 1, files.length, file.path);
        await sandbox.write(file.path, file.content);
        appliedFiles.push(file.path);
      })
    );

    return { success: true, appliedFiles };
  } catch (error) {
    console.error("Error applying files to sandbox:", error);
    return {
      success: false,
      appliedFiles: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function installPackages(
  packages: string[],
  sandboxId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    const result = await sandbox.install(packages);
    return { success: result.success, error: result.stderr || undefined };
  } catch (error) {
    console.error("Error installing packages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function restartSandbox(
  sandboxId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    await sandbox.restartDevServer();
    return { success: true };
  } catch (error) {
    console.error("Error restarting sandbox:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function runSandboxDiagnostics(
  sandboxId?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const sandbox = sandboxId
      ? sandboxManager.get(sandboxId)
      : sandboxManager.getActive();

    if (!sandbox) {
      return { success: false, error: "No active sandbox" };
    }

    const result = await sandbox.runDiagnostics();
    return {
      success: result.success,
      output: result.output,
    };
  } catch (error) {
    console.error("Error running diagnostics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function killSandbox(
  sandboxId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (sandboxId) {
      await sandboxManager.terminate(sandboxId);
    } else {
      await sandboxManager.terminateAll();
    }
    return { success: true };
  } catch (error) {
    console.error("Error killing sandbox:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
