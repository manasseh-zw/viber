import { appEnv } from "../env/env.server";
import type { SandboxProvider } from "../types/sandbox";

export interface MorphEditBlock {
  targetFile: string;
  instructions: string;
  update: string;
}

export interface MorphApplyResult {
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

  const fullPath = `/home/user/app/${normalizedPath}`;
  return { normalizedPath, fullPath };
}

async function morphChatCompletionsCreate(payload: {
  model: string;
  messages: Array<{ role: string; content: string }>;
}) {
  if (!appEnv.MORPH_API_KEY) throw new Error("MORPH_API_KEY is not set");

  const res = await fetch("https://api.morphllm.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appEnv.MORPH_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Morph API error ${res.status}: ${text}`);
  }

  return res.json();
}

export function parseMorphEdits(text: string): MorphEditBlock[] {
  const edits: MorphEditBlock[] = [];
  const editRegex = /<edit\s+target_file="([^"]+)">([\s\S]*?)<\/edit>/g;
  let match: RegExpExecArray | null;

  while ((match = editRegex.exec(text)) !== null) {
    const targetFile = match[1].trim();
    const inner = match[2];
    const instrMatch = inner.match(/<instructions>([\s\S]*?)<\/instructions>/);
    const updateMatch = inner.match(/<update>([\s\S]*?)<\/update>/);
    const instructions = instrMatch ? instrMatch[1].trim() : "";
    const update = updateMatch ? updateMatch[1].trim() : "";

    if (targetFile && update) {
      edits.push({ targetFile, instructions, update });
    }
  }

  return edits;
}

async function readFileFromSandbox(
  provider: SandboxProvider,
  normalizedPath: string,
  fullPath: string
): Promise<string> {
  if (
    (globalThis as Record<string, unknown>).sandboxState &&
    typeof (globalThis as Record<string, unknown>).sandboxState === "object"
  ) {
    const state = (globalThis as Record<string, unknown>).sandboxState as {
      fileCache?: { files?: Record<string, { content?: string }> };
    };
    if (state.fileCache?.files?.[normalizedPath]?.content) {
      return state.fileCache.files[normalizedPath].content as string;
    }
  }

  try {
    return await provider.readFile(fullPath);
  } catch {
    try {
      return await provider.readFile(normalizedPath);
    } catch {
      throw new Error(`Unable to read file: ${normalizedPath}`);
    }
  }
}

async function writeFileToSandbox(
  provider: SandboxProvider,
  normalizedPath: string,
  fullPath: string,
  content: string
): Promise<void> {
  try {
    await provider.writeFile(fullPath, content);
  } catch {
    await provider.writeFile(normalizedPath, content);
  }

  if (
    (globalThis as Record<string, unknown>).sandboxState &&
    typeof (globalThis as Record<string, unknown>).sandboxState === "object"
  ) {
    const state = (globalThis as Record<string, unknown>).sandboxState as {
      fileCache?: {
        files?: Record<string, { content?: string; lastModified?: number }>;
      };
    };
    if (state.fileCache?.files) {
      state.fileCache.files[normalizedPath] = {
        content,
        lastModified: Date.now(),
      };
    }
  }

  if ((globalThis as Record<string, unknown>).existingFiles instanceof Set) {
    ((globalThis as Record<string, unknown>).existingFiles as Set<string>).add(
      normalizedPath
    );
  }
}

export async function applyMorphEditToFile(params: {
  provider: SandboxProvider;
  targetPath: string;
  instructions: string;
  updateSnippet: string;
}): Promise<MorphApplyResult> {
  try {
    if (!appEnv.MORPH_API_KEY) {
      return { success: false, error: "MORPH_API_KEY not set" };
    }

    const { normalizedPath, fullPath } = normalizeProjectPath(
      params.targetPath
    );

    const initialCode = await readFileFromSandbox(
      params.provider,
      normalizedPath,
      fullPath
    );

    const resp = await morphChatCompletionsCreate({
      model: "morph-v3-large",
      messages: [
        {
          role: "user",
          content: `<instruction>${params.instructions || ""}</instruction>\n<code>${initialCode}</code>\n<update>${params.updateSnippet}</update>`,
        },
      ],
    });

    const mergedCode =
      (resp as { choices?: Array<{ message?: { content?: string } }> })
        ?.choices?.[0]?.message?.content || "";

    if (!mergedCode) {
      return {
        success: false,
        error: "Morph returned empty content",
        normalizedPath,
      };
    }

    await writeFileToSandbox(
      params.provider,
      normalizedPath,
      fullPath,
      mergedCode
    );

    return { success: true, normalizedPath, mergedCode };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export function isMorphAvailable(): boolean {
  return !!appEnv.MORPH_API_KEY;
}
