import { sandboxManager } from "./manager";
import { SandboxFactory } from "./factory";
import type { SandboxInfo, SandboxFile } from "./types";

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

    const provider = SandboxFactory.create();
    const sandboxInfo: SandboxInfo = await provider.createSandbox();
    await provider.setupViteApp();

    sandboxManager.registerSandbox(sandboxInfo.sandboxId, provider);

    return {
      success: true,
      sandboxId: sandboxInfo.sandboxId,
      url: sandboxInfo.url,
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
    const provider = sandboxId
      ? sandboxManager.getProvider(sandboxId)
      : sandboxManager.getActiveProvider();

    if (!provider) {
      return { success: false, error: "No active sandbox" };
    }

    const fileList = await provider.listFiles();
    const fileContents: Record<string, string> = {};

    for (const file of fileList) {
      try {
        fileContents[file] = await provider.readFile(file);
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

    const provider = sandboxManager.getProvider(id);
    if (!provider) {
      return { success: false, error: "Sandbox not found" };
    }

    const info = provider.getSandboxInfo();
    return {
      success: true,
      isAlive: provider.isAlive(),
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
  useMorphForEdits: boolean = true
): Promise<{ success: boolean; appliedFiles: string[]; error?: string }> {
  try {
    const provider = sandboxId
      ? sandboxManager.getProvider(sandboxId)
      : sandboxManager.getActiveProvider();

    if (!provider) {
      return { success: false, appliedFiles: [], error: "No active sandbox" };
    }

    const appliedFiles: string[] = [];
    const { applyMorphEditToFile, isMorphAvailable } = await import(
      "../helpers/morph-apply"
    );

    const morphAvailable = isMorphAvailable() && useMorphForEdits;

    for (const file of files) {
      try {
        const existingFiles = await provider.listFiles();
        const fileExists = existingFiles.some(
          (f) => f === file.path || f.endsWith(file.path)
        );

        if (fileExists && morphAvailable) {
          console.log(
            `[applyFilesToSandbox] Using Morph to merge edits for existing file: ${file.path}`
          );
          const morphResult = await applyMorphEditToFile({
            provider,
            targetPath: file.path,
            instructions: `Apply the following changes to the file`,
            updateSnippet: file.content,
          });

          if (morphResult.success) {
            appliedFiles.push(file.path);
            console.log(
              `[applyFilesToSandbox] Morph successfully merged: ${file.path}`
            );
          } else {
            console.warn(
              `[applyFilesToSandbox] Morph failed, falling back to direct write: ${morphResult.error}`
            );
            await provider.writeFile(file.path, file.content);
            appliedFiles.push(file.path);
          }
        } else {
          await provider.writeFile(file.path, file.content);
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
    const provider = sandboxId
      ? sandboxManager.getProvider(sandboxId)
      : sandboxManager.getActiveProvider();

    if (!provider) {
      return { success: false, error: "No active sandbox" };
    }

    const result = await provider.installPackages(packages);
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
    const provider = sandboxId
      ? sandboxManager.getProvider(sandboxId)
      : sandboxManager.getActiveProvider();

    if (!provider) {
      return { success: false, error: "No active sandbox" };
    }

    await provider.restartViteServer();
    return { success: true };
  } catch (error) {
    console.error("Error restarting sandbox:", error);
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
      await sandboxManager.terminateSandbox(sandboxId);
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
