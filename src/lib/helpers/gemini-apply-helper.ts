import type { DaytonaSandbox } from "../sandbox/daytona.provider";
import { mergeCodeWithGemini } from "./gemini-apply";

export interface GeminiApplyResult {
  success: boolean;
  normalizedPath?: string;
  mergedCode?: string;
  error?: string;
}

export function normalizeProjectPath(inputPath: string): {
  normalizedPath: string;
  fullPath: string;
} {
  let normalizedPath = inputPath.trim();
  if (normalizedPath.startsWith("/")) normalizedPath = normalizedPath.slice(1);

  const configFiles = new Set([
    "tailwind.config.js",
    "vite.config.js",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "postcss.config.js",
  ]);

  const fileName = normalizedPath.split("/").pop() || "";
  if (
    !normalizedPath.startsWith("src/") &&
    !normalizedPath.startsWith("public/") &&
    normalizedPath !== "index.html" &&
    !configFiles.has(fileName)
  ) {
    normalizedPath = "src/" + normalizedPath;
  }

  const fullPath = `/home/daytona/app/${normalizedPath}`;
  return { normalizedPath, fullPath };
}

async function readFileFromSandbox(
  sandbox: DaytonaSandbox,
  normalizedPath: string,
  fullPath: string
): Promise<string> {
  try {
    return await sandbox.read(fullPath);
  } catch {
    try {
      return await sandbox.read(normalizedPath);
    } catch {
      throw new Error(`Unable to read file: ${normalizedPath}`);
    }
  }
}

async function writeFileToSandbox(
  sandbox: DaytonaSandbox,
  normalizedPath: string,
  fullPath: string,
  content: string
): Promise<void> {
  try {
    await sandbox.write(fullPath, content);
  } catch {
    await sandbox.write(normalizedPath, content);
  }
}

export async function applyGeminiEditToFile(params: {
  sandbox: DaytonaSandbox;
  targetPath: string;
  instructions: string;
  updateSnippet: string;
}): Promise<GeminiApplyResult> {
  try {
    const { normalizedPath, fullPath } = normalizeProjectPath(
      params.targetPath
    );

    const initialCode = await readFileFromSandbox(
      params.sandbox,
      normalizedPath,
      fullPath
    );

    console.log("[Apply] Using Gemini Flash for code merge:", normalizedPath);
    const result = await mergeCodeWithGemini({
      originalCode: initialCode,
      instructions: params.instructions,
      updateSnippet: params.updateSnippet,
      fileName: normalizedPath,
    });

    if (!result.success || !result.mergedCode) {
      return {
        success: false,
        error: result.error || "Gemini failed to merge code",
        normalizedPath,
      };
    }

    await writeFileToSandbox(
      params.sandbox,
      normalizedPath,
      fullPath,
      result.mergedCode
    );

    return { success: true, normalizedPath, mergedCode: result.mergedCode };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
