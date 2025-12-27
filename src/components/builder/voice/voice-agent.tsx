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
}

interface VibeBuildParams {
  prompt: string;
  action: "create" | "edit";
}

interface NavigateUiParams {
  panel: "preview" | "code" | "files";
  file?: string;
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
      vibe_build: async ({ prompt, action }: VibeBuildParams) => {
        console.log("[VoiceAgent] vibe_build called");
        console.log("[VoiceAgent] prompt:", prompt);
        console.log("[VoiceAgent] action:", action);
        console.log("[VoiceAgent] sandboxId:", sandboxIdRef.current);
        console.log("[VoiceAgent] isReady:", isReadyRef.current);

        if (!prompt) {
          console.error("[VoiceAgent] Missing prompt parameter");
          return "Error: Missing prompt parameter";
        }

        const isEdit = action === "edit" && isReadyRef.current;

        try {
          await onGenerateRef.current({
            prompt,
            isEdit,
            sandboxId: sandboxIdRef.current,
          });
          return "Generation started successfully. I will provide updates as files are created.";
        } catch (error) {
          console.error("[VoiceAgent] Generation error:", error);
          return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      },

      navigate_ui: ({ panel, file }: NavigateUiParams) => {
        console.log("[VoiceAgent] navigate_ui called");
        console.log("[VoiceAgent] panel:", panel);
        console.log("[VoiceAgent] file:", file);

        onNavigate(panel, file);
        return `Navigated to ${panel} view${file ? ` showing ${file}` : ""}`;
      },
    },

    onConnect: () => {
      console.log("[VoiceAgent] Connected to ElevenLabs");
      onStatusChange("connected");
    },

    onDisconnect: () => {
      console.log("[VoiceAgent] Disconnected from ElevenLabs");
      onStatusChange("disconnected");
    },

    onMessage: (message) => {
      console.log("[VoiceAgent] Message:", message);
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

    onUnhandledClientToolCall: (toolCall) => {
      console.warn("[VoiceAgent] Unhandled tool call:", toolCall.tool_name);
      console.warn("[VoiceAgent] Tool call details:", toolCall);
    },
  });

  useEffect(() => {
    globalVoiceAgent = {
      sendSystemUpdate: (message: string) => {
        if (conversation.status === "connected") {
          try {
            conversation.sendUserMessage(`[SYSTEM] ${message}`);
          } catch (error) {
            console.warn("[VoiceAgent] Failed to send system update:", error);
          }
        } else {
          console.warn(
            "[VoiceAgent] Cannot send message, status:",
            conversation.status
          );
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
            connectionType: "webrtc",
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
