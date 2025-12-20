import { useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { clientEnv } from "@/lib/env/env.client";
import type { GenerateOptions } from "@/lib/hooks/use-generation";

const AGENT_ID = clientEnv.ELEVENLABS_AGENT_ID;

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VoiceAgentProps {
  onStatusChange: (status: "disconnected" | "connecting" | "connected") => void;
  onMessage: (message: AgentMessage) => void;
  onNavigate: (panel: "preview" | "code" | "files", file?: string) => void;
  onGenerate: (options: GenerateOptions) => Promise<void>;
  sandboxId?: string;
  isReady: boolean;
  isMuted: boolean;
}

let globalVoiceAgent: {
  sendSystemUpdate: (message: string) => void;
  startSession: () => Promise<void>;
  endSession: () => void;
  getInputVolume: () => number;
  getOutputVolume: () => number;
} | null = null;

export function VoiceAgent({
  onStatusChange,
  onMessage,
  onNavigate,
  onGenerate,
  sandboxId,
  isReady,
  isMuted,
}: VoiceAgentProps) {
  const sandboxIdRef = useRef(sandboxId);
  const isReadyRef = useRef(isReady);
  const onGenerateRef = useRef(onGenerate);

  useEffect(() => {
    sandboxIdRef.current = sandboxId;
    isReadyRef.current = isReady;
    onGenerateRef.current = onGenerate;
  }, [sandboxId, isReady, onGenerate]);

  const conversation = useConversation({
    clientTools: {
      vibe_build: async (params: {
        prompt: string;
        action: "create" | "edit";
      }) => {
        console.log("[VoiceAgent] vibe_build called:", params);

        const isEdit = params.action === "edit" && isReadyRef.current;

        try {
          await onGenerateRef.current({
            prompt: params.prompt,
            isEdit,
            sandboxId: sandboxIdRef.current,
          });
          return "Generation started successfully";
        } catch (error) {
          console.error("[VoiceAgent] Generation error:", error);
          return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      },

      navigate_ui: (params: {
        panel: "preview" | "code" | "files";
        file?: string;
      }) => {
        console.log("[VoiceAgent] navigate_ui called:", params);
        onNavigate(params.panel, params.file);
        return `Switched to ${params.panel} view`;
      },
    },
    onConnect: () => {
      console.log("[VoiceAgent] Connected");
      onStatusChange("connected");
    },
    onDisconnect: () => {
      console.log("[VoiceAgent] Disconnected");
      onStatusChange("disconnected");
    },
    onMessage: (message) => {
      if (message.message && message.source !== "user") {
        onMessage({
          role: "assistant",
          content: message.message,
          timestamp: new Date(),
        });
      }
    },
    onError: (error) => {
      console.error("[VoiceAgent] Error:", error);
      onStatusChange("disconnected");
    },
  });

  useEffect(() => {
    globalVoiceAgent = {
      sendSystemUpdate: (message: string) => {
        if (conversation.status === "connected") {
          conversation.sendUserMessage(`[SYSTEM] ${message}`);
        }
      },
      startSession: async () => {
        if (!AGENT_ID) {
          console.error("[VoiceAgent] No agent ID configured");
          return;
        }
        onStatusChange("connecting");
        try {
          await conversation.startSession({
            agentId: AGENT_ID,
          });
        } catch (error) {
          console.error("[VoiceAgent] Failed to start session:", error);
          onStatusChange("disconnected");
        }
      },
      endSession: () => {
        conversation.endSession();
      },
      getInputVolume: () => conversation.getInputVolume?.() ?? 0,
      getOutputVolume: () => conversation.getOutputVolume?.() ?? 0,
    };

    return () => {
      globalVoiceAgent = null;
    };
  }, [conversation, onStatusChange]);

  return null;
}

export function useVoiceAgentControls() {
  return {
    sendSystemUpdate: (message: string) => {
      globalVoiceAgent?.sendSystemUpdate(message);
    },
    startSession: async () => {
      await globalVoiceAgent?.startSession();
    },
    endSession: () => {
      globalVoiceAgent?.endSession();
    },
    getInputVolume: () => {
      return globalVoiceAgent?.getInputVolume() ?? 0;
    },
    getOutputVolume: () => {
      return globalVoiceAgent?.getOutputVolume() ?? 0;
    },
  };
}
