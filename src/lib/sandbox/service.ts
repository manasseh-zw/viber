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

    for (const file of fileList) {
      try {
        fileContents[file] = await sandbox.read(file);
      } catch {
        // Skip unreadable files
      }
    }

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
    const { applyGeminiEditToFile } = await import(
      "../helpers/gemini-apply-helper"
    );

    // Only fetch file list if we have multiple files and might be editing
    const existingFiles = files.length > 1 ? await sandbox.files() : [];

    // Separate new files from edits
    const newFiles: SandboxFile[] = [];
    const editFiles: SandboxFile[] = [];
    
    for (const file of files) {
      const fileExists = existingFiles.some(
        (f) => f === file.path || f.endsWith(file.path)
      );
      if (fileExists) {
        editFiles.push(file);
      } else {
        newFiles.push(file);
      }
    }

    // Write new files in parallel (no merging needed)
    if (newFiles.length > 0) {
      console.log(`[applyFilesToSandbox] Writing ${newFiles.length} new files in parallel`);
      await Promise.all(
        newFiles.map(async (file, index) => {
          onProgress?.(index + 1, files.length, file.path);
          await sandbox.write(file.path, file.content);
          appliedFiles.push(file.path);
        })
      );
    }

    // Process edits sequentially (require Gemini merging)
    for (let i = 0; i < editFiles.length; i++) {
      const file = editFiles[i];
      onProgress?.(newFiles.length + i + 1, files.length, file.path);
      
      try {
        console.log(
          `[applyFilesToSandbox] Using Gemini to merge edits for: ${file.path}`
        );
        const mergeResult = await applyGeminiEditToFile({
          sandbox,
          targetPath: file.path,
          instructions: `Apply the following changes to the file`,
          updateSnippet: file.content,
        });

        if (mergeResult.success) {
          appliedFiles.push(file.path);
        } else {
          console.warn(
            `[applyFilesToSandbox] Gemini merge failed, falling back to direct write: ${mergeResult.error}`
          );
          await sandbox.write(file.path, file.content);
          appliedFiles.push(file.path);
        }
      } catch (fileError) {
        console.error(
          `[applyFilesToSandbox] Error applying file ${file.path}:`,
          fileError
        );
        throw fileError;
      }
    }

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
