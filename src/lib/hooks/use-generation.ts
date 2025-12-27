import { useState, useCallback, useRef, useEffect } from "react";
import type { GeneratedFile } from "../types/ai";

export interface StreamingFile {
  path: string;
  content: string;
  type: "javascript" | "css" | "json" | "html" | "text";
  completed: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  isApplying: boolean;
  isChecking: boolean;
  isStreaming: boolean;
  progress: string;
  streamedCode: string;
  currentFile: StreamingFile | null;
  files: GeneratedFile[];
  streamingFiles: StreamingFile[];
  packages: string[];
  error: string | null;
}

function getFileType(path: string): StreamingFile["type"] {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return "javascript";
    case "css":
      return "css";
    case "json":
      return "json";
    case "html":
      return "html";
    default:
      return "text";
  }
}

function parseStreamingFiles(
  streamedCode: string,
  existingFiles: Set<string>
): { completedFiles: StreamingFile[]; currentFile: StreamingFile | null } {
  const completedFiles: StreamingFile[] = [];
  let currentFile: StreamingFile | null = null;

  const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
  let match;
  while ((match = fileRegex.exec(streamedCode)) !== null) {
    const path = match[1].trim();
    if (!existingFiles.has(path)) {
      existingFiles.add(path);
      completedFiles.push({
        path,
        content: match[2].trim(),
        type: getFileType(path),
        completed: true,
      });
    }
  }

  const partialMatch = streamedCode.match(/<file\s+path="([^"]+)">([\s\S]*)$/);
  if (partialMatch && !partialMatch[0].includes("</file>")) {
    const path = partialMatch[1].trim();
    currentFile = {
      path,
      content: partialMatch[2],
      type: getFileType(path),
      completed: false,
    };
  }

  return { completedFiles, currentFile };
}

const initialState: GenerationState = {
  isGenerating: false,
  isApplying: false,
  isChecking: false,
  isStreaming: false,
  progress: "",
  streamedCode: "",
  currentFile: null,
  files: [],
  streamingFiles: [],
  packages: [],
  error: null,
};

export interface GenerateOptions {
  prompt: string;
  isEdit?: boolean;
  sandboxId?: string;
  onStream?: (text: string) => void;
  onFile?: (file: GeneratedFile) => void;
  onPackage?: (pkg: string) => void;
  onComplete?: (files: GeneratedFile[], packages: string[]) => void;
  onError?: (error: string) => void;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (state.isStreaming) {
      if (!audioRef.current) {
        audioRef.current = new Audio("/keyboard.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.25;
      }
      audioRef.current.play().catch(() => {});
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [state.isStreaming]);

  const generate = useCallback(async (options: GenerateOptions) => {
    const {
      prompt,
      isEdit = false,
      sandboxId,
      onStream,
      onFile,
      onPackage,
      onComplete,
      onError,
    } = options;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const processedFiles = new Set<string>();

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      isStreaming: false,
      progress: "Starting generation...",
      streamedCode: "",
      currentFile: null,
      files: [],
      streamingFiles: [],
      packages: [],
      error: null,
    }));

    try {
      console.log("[useGeneration] Starting generation request", {
        prompt: prompt.substring(0, 100),
        isEdit,
        sandboxId,
      });

      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, isEdit, sandboxId }),
        signal: abortControllerRef.current.signal,
      });

      console.log("[useGeneration] Response received", {
        ok: response.ok,
        status: response.status,
        hasBody: !!response.body,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start generation");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collectedFiles: GeneratedFile[] = [];
      const collectedPackages: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "heartbeat":
                // Keep-alive message, ignore
                break;

              case "status":
                setState((prev) => ({ ...prev, progress: event.message }));
                break;

              case "stream":
                setState((prev) => {
                  const newStreamedCode =
                    prev.streamedCode + event.data.content;
                  const { completedFiles, currentFile } = parseStreamingFiles(
                    newStreamedCode,
                    processedFiles
                  );

                  return {
                    ...prev,
                    streamedCode: newStreamedCode,
                    isStreaming: true,
                    currentFile,
                    streamingFiles: [...prev.streamingFiles, ...completedFiles],
                    progress: currentFile
                      ? `Generating ${currentFile.path}`
                      : completedFiles.length > 0
                        ? `Completed ${completedFiles[completedFiles.length - 1].path}`
                        : prev.progress,
                  };
                });
                onStream?.(event.data.content);
                break;

              case "file":
                const file = event.data as GeneratedFile;
                collectedFiles.push(file);
                setState((prev) => ({
                  ...prev,
                  files: [...prev.files, file],
                }));
                onFile?.(file);
                break;

              case "package":
                const pkg = event.data.name;
                collectedPackages.push(pkg);
                setState((prev) => ({
                  ...prev,
                  packages: [...prev.packages, pkg],
                }));
                onPackage?.(pkg);
                break;

              case "complete":
                setState((prev) => ({
                  ...prev,
                  isGenerating: false,
                  isStreaming: false,
                  progress: "Generation complete",
                  currentFile: null,
                }));
                onComplete?.(collectedFiles, collectedPackages);
                break;

              case "error":
                throw new Error(event.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      const message = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        error: message,
      }));
      onError?.(message);
    }
  }, []);

  const apply = useCallback(
    async (
      files: GeneratedFile[],
      packages: string[],
      sandboxId?: string
    ): Promise<boolean> => {
      setState((prev) => ({
        ...prev,
        isApplying: true,
        progress: "Applying code to sandbox...",
      }));

      try {
        const response = await fetch("/api/apply/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files, packages, sandboxId }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to apply code");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "status") {
                setState((prev) => ({ ...prev, progress: event.message }));
              }
            } catch {
              continue;
            }
          }
        }

        setState((prev) => ({
          ...prev,
          isApplying: false,
          progress: "Code applied successfully",
        }));

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          isApplying: false,
          error: message,
        }));
        return false;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      isStreaming: false,
      progress: "Generation cancelled",
    }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  const checkDiagnostics = useCallback(
    async (
      sandboxId?: string
    ): Promise<{ success: boolean; output?: string }> => {
      setState((prev) => ({
        ...prev,
        isChecking: true,
        progress: "Running diagnostics...",
      }));

      try {
        const response = await fetch("/api/sandbox/diagnostics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId }),
        });

        if (!response.ok) {
          throw new Error("Failed to run diagnostics");
        }

        const result = await response.json();

        setState((prev) => ({
          ...prev,
          isChecking: false,
          progress: result.success
            ? "Diagnostics passed"
            : "Diagnostics found issues",
        }));

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: message,
        }));
        return { success: false };
      }
    },
    []
  );

  return {
    ...state,
    generate,
    apply,
    cancel,
    reset,
    checkDiagnostics,
  };
}
