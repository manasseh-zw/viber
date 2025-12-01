import { useState, useCallback, useRef } from "react";
import type { GeneratedFile } from "../types/ai";

export interface GenerationState {
  isGenerating: boolean;
  isApplying: boolean;
  progress: string;
  streamedCode: string;
  currentFile: string | null;
  files: GeneratedFile[];
  packages: string[];
  error: string | null;
}

const initialState: GenerationState = {
  isGenerating: false,
  isApplying: false,
  progress: "",
  streamedCode: "",
  currentFile: null,
  files: [],
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

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      progress: "Starting generation...",
      streamedCode: "",
      files: [],
      packages: [],
      error: null,
    }));

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, isEdit, sandboxId }),
        signal: abortControllerRef.current.signal,
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
              case "status":
                setState((prev) => ({ ...prev, progress: event.message }));
                break;

              case "stream":
                setState((prev) => ({
                  ...prev,
                  streamedCode: prev.streamedCode + event.data.content,
                }));
                onStream?.(event.data.content);
                break;

              case "file":
                const file = event.data as GeneratedFile;
                collectedFiles.push(file);
                setState((prev) => ({
                  ...prev,
                  currentFile: file.path,
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
      progress: "Generation cancelled",
    }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    ...state,
    generate,
    apply,
    cancel,
    reset,
  };
}
