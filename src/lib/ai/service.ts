import { streamText } from "ai";
import { getModel } from "./provider";
import { buildSystemPrompt } from "./prompts";
import { appConfig } from "../config";
import type { GeneratedFile, AnyStreamEvent } from "../types/ai";

export interface GenerateCodeOptions {
  prompt: string;
  isEdit?: boolean;
  model?: string;
  fileContext?: Record<string, string>;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  onEvent?: (event: AnyStreamEvent) => void;
}

export interface GenerateCodeResult {
  success: boolean;
  files: GeneratedFile[];
  packages: string[];
  rawResponse: string;
  error?: string;
}

export function parseFileTags(content: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const [, path, fileContent] = match;
    files.push({
      path: path.trim(),
      content: fileContent.trim(),
    });
  }

  return files;
}

export function parsePackageTags(content: string): string[] {
  const packages: string[] = [];
  const packageRegex = /<package>([^<]+)<\/package>/g;

  let match;
  while ((match = packageRegex.exec(content)) !== null) {
    const pkg = match[1].trim();
    if (pkg && !packages.includes(pkg)) {
      packages.push(pkg);
    }
  }

  return packages;
}

function formatConversationHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string {
  if (!messages || messages.length === 0) return "";

  const formattedMessages = messages
    .slice(-appConfig.ui.maxRecentMessagesContext)
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");

  return `\nRECENT CONVERSATION:\n${formattedMessages}\n`;
}

class IncrementalParser {
  private buffer = "";
  private emittedFiles = new Set<string>();
  private emittedPackages = new Set<string>();

  append(chunk: string): {
    newFiles: GeneratedFile[];
    newPackages: string[];
  } {
    this.buffer += chunk;
    const newFiles: GeneratedFile[] = [];
    const newPackages: string[] = [];

    const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    while ((match = fileRegex.exec(this.buffer)) !== null) {
      const path = match[1].trim();
      if (!this.emittedFiles.has(path)) {
        this.emittedFiles.add(path);
        newFiles.push({
          path,
          content: match[2].trim(),
        });
      }
    }

    const packageRegex = /<package>([^<]+)<\/package>/g;
    while ((match = packageRegex.exec(this.buffer)) !== null) {
      const pkg = match[1].trim();
      if (pkg && !this.emittedPackages.has(pkg)) {
        this.emittedPackages.add(pkg);
        newPackages.push(pkg);
      }
    }

    return { newFiles, newPackages };
  }

  getAll(): { files: GeneratedFile[]; packages: string[] } {
    return {
      files: parseFileTags(this.buffer),
      packages: parsePackageTags(this.buffer),
    };
  }

  getRawResponse(): string {
    return this.buffer;
  }
}

export async function generateCode(
  options: GenerateCodeOptions
): Promise<GenerateCodeResult> {
  const {
    prompt,
    isEdit = false,
    model,
    fileContext,
    recentMessages,
    onEvent,
  } = options;

  try {
    const systemPrompt = buildSystemPrompt(isEdit, fileContext);
    const conversationContext = formatConversationHistory(recentMessages || []);
    const fullPrompt = conversationContext + prompt;

    onEvent?.({ type: "status", message: "Starting code generation..." });

    const result = await streamText({
      model: getModel(model),
      system: systemPrompt,
      prompt: fullPrompt,
      temperature: appConfig.ai.defaultTemperature,
      maxOutputTokens: appConfig.ai.maxTokens,
    });

    const parser = new IncrementalParser();

    onEvent?.({ type: "status", message: "Generating code..." });

    for await (const chunk of result.textStream) {
      onEvent?.({
        type: "stream",
        data: { content: chunk, index: parser.getRawResponse().length },
      });

      const { newFiles, newPackages } = parser.append(chunk);

      for (const file of newFiles) {
        onEvent?.({
          type: "file",
          data: { path: file.path, content: file.content },
        });
      }

      for (const pkg of newPackages) {
        onEvent?.({
          type: "package",
          data: { name: pkg },
        });
      }
    }

    const { files, packages } = parser.getAll();

    onEvent?.({
      type: "complete",
      data: { files, packages },
    });

    return {
      success: true,
      files,
      packages,
      rawResponse: parser.getRawResponse(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    onEvent?.({
      type: "error",
      message: errorMessage,
    });

    return {
      success: false,
      files: [],
      packages: [],
      rawResponse: "",
      error: errorMessage,
    };
  }
}

export async function* streamGenerateCode(
  options: GenerateCodeOptions
): AsyncGenerator<AnyStreamEvent> {
  const {
    prompt,
    isEdit = false,
    model,
    fileContext,
    recentMessages,
  } = options;

  console.log("[AI Service] Starting code generation stream", {
    prompt: prompt.substring(0, 100),
    isEdit,
    model: model || "default",
    hasFileContext: !!fileContext && Object.keys(fileContext).length > 0,
    fileContextKeys: fileContext ? Object.keys(fileContext).slice(0, 5) : [],
    recentMessagesCount: recentMessages?.length || 0,
  });

  try {
    const systemPrompt = buildSystemPrompt(isEdit, fileContext);
    const conversationContext = formatConversationHistory(recentMessages || []);
    const fullPrompt = conversationContext + prompt;

    console.log("[AI Service] System prompt built", {
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 200),
      fullPromptLength: fullPrompt.length,
    });

    yield { type: "status", message: "Starting code generation..." };

    console.log("[AI Service] Calling LLM for code generation", {
      model: model || "default",
      temperature: appConfig.ai.defaultTemperature,
      maxTokens: appConfig.ai.maxTokens,
    });

    const result = await streamText({
      model: getModel(model),
      system: systemPrompt,
      prompt: fullPrompt,
      temperature: appConfig.ai.defaultTemperature,
      maxOutputTokens: appConfig.ai.maxTokens,
    });

    console.log("[AI Service] LLM stream started, beginning to parse chunks");

    const parser = new IncrementalParser();

    yield { type: "status", message: "Generating code..." };

    let chunkCount = 0;
    for await (const chunk of result.textStream) {
      chunkCount++;
      if (chunkCount % 10 === 0) {
        console.log("[AI Service] Processing chunks", {
          chunkCount,
          totalLength: parser.getRawResponse().length,
        });
      }

      yield {
        type: "stream",
        data: { content: chunk, index: parser.getRawResponse().length },
      };

      const { newFiles, newPackages } = parser.append(chunk);

      if (newFiles.length > 0) {
        console.log("[AI Service] New files parsed", {
          files: newFiles.map((f) => f.path),
        });
      }

      if (newPackages.length > 0) {
        console.log("[AI Service] New packages parsed", { packages: newPackages });
      }

      for (const file of newFiles) {
        yield {
          type: "file",
          data: { path: file.path, content: file.content },
        };
      }

      for (const pkg of newPackages) {
        yield {
          type: "package",
          data: { name: pkg },
        };
      }
    }

    const { files, packages } = parser.getAll();

    console.log("[AI Service] Generation complete", {
      totalChunks: chunkCount,
      totalFiles: files.length,
      totalPackages: packages.length,
      files: files.map((f) => f.path),
      packages,
      rawResponseLength: parser.getRawResponse().length,
    });

    yield {
      type: "complete",
      data: { files, packages },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[AI Service] Generation error", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    yield {
      type: "error",
      message: errorMessage,
    };
  }
}
