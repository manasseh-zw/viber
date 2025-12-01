import { useState, useCallback } from "react";

export interface SandboxState {
  sandboxId: string | null;
  sandboxUrl: string | null;
  isCreating: boolean;
  isReady: boolean;
  files: Record<string, string>;
  error: string | null;
}

const initialState: SandboxState = {
  sandboxId: null,
  sandboxUrl: null,
  isCreating: false,
  isReady: false,
  files: {},
  error: null,
};

export function useSandbox() {
  const [state, setState] = useState<SandboxState>(initialState);

  const createSandbox = useCallback(async () => {
    setState((prev) => ({ ...prev, isCreating: true, error: null }));

    try {
      const response = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create sandbox");
      }

      setState((prev) => ({
        ...prev,
        sandboxId: data.sandboxId,
        sandboxUrl: data.url,
        isCreating: false,
        isReady: true,
      }));

      return { sandboxId: data.sandboxId, url: data.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        isCreating: false,
        error: message,
      }));
      return null;
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!state.sandboxId) return;

    try {
      const response = await fetch(
        `/api/sandbox/files?sandboxId=${state.sandboxId}`
      );
      const data = await response.json();

      if (data.success && data.files) {
        setState((prev) => ({ ...prev, files: data.files }));
      }
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  }, [state.sandboxId]);

  const getStatus = useCallback(async () => {
    if (!state.sandboxId) return null;

    try {
      const response = await fetch(
        `/api/sandbox/status?sandboxId=${state.sandboxId}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to get status:", error);
      return null;
    }
  }, [state.sandboxId]);

  const killSandbox = useCallback(async () => {
    try {
      const response = await fetch("/api/sandbox/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId: state.sandboxId }),
      });

      const data = await response.json();

      if (data.success) {
        setState(initialState);
      }

      return data.success;
    } catch (error) {
      console.error("Failed to kill sandbox:", error);
      return false;
    }
  }, [state.sandboxId]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    createSandbox,
    refreshFiles,
    getStatus,
    killSandbox,
    reset,
  };
}
