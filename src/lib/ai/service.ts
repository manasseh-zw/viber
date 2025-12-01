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

    let rawResponse = "";

    onEvent?.({ type: "status", message: "Generating code..." });

    for await (const chunk of result.textStream) {
      rawResponse += chunk;
      onEvent?.({
        type: "stream",
        data: { content: chunk, index: rawResponse.length },
      });
    }

    onEvent?.({ type: "status", message: "Parsing generated code..." });

    const files = parseFileTags(rawResponse);
    const packages = parsePackageTags(rawResponse);

    for (const file of files) {
      onEvent?.({
        type: "file",
        data: { path: file.path, content: file.content },
      });
    }

    for (const pkg of packages) {
      onEvent?.({
        type: "package",
        data: { name: pkg },
      });
    }

    onEvent?.({
      type: "complete",
      data: { files, packages },
    });

    return {
      success: true,
      files,
      packages,
      rawResponse,
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

  try {
    const systemPrompt = buildSystemPrompt(isEdit, fileContext);
    const conversationContext = formatConversationHistory(recentMessages || []);
    const fullPrompt = conversationContext + prompt;

    yield { type: "status", message: "Starting code generation..." };

    const result = await streamText({
      model: getModel(model),
      system: systemPrompt,
      prompt: fullPrompt,
      temperature: appConfig.ai.defaultTemperature,
      maxOutputTokens: appConfig.ai.maxTokens,
    });

    let rawResponse = "";

    yield { type: "status", message: "Generating code..." };

    for await (const chunk of result.textStream) {
      rawResponse += chunk;
      yield {
        type: "stream",
        data: { content: chunk, index: rawResponse.length },
      };
    }

    yield { type: "status", message: "Parsing generated code..." };

    const files = parseFileTags(rawResponse);
    const packages = parsePackageTags(rawResponse);

    for (const file of files) {
      yield {
        type: "file",
        data: { path: file.path, content: file.content },
      };
    }

    for (const pkg of packages) {
      yield {
        type: "package",
        data: { name: pkg },
      };
    }

    yield {
      type: "complete",
      data: { files, packages },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    yield {
      type: "error",
      message: errorMessage,
    };
  }
}
