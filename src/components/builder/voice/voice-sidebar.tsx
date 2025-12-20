import { useState, useCallback } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  PhoneIcon,
  PhoneDisconnectIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { Orb } from "@/components/ui/orb";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { VoiceAgent, useVoiceAgentControls } from "./voice-agent";
import { cn } from "@/lib/utils";
import type { GenerateOptions } from "@/lib/hooks/use-generation";

interface VoiceSidebarProps {
  onNavigate: (panel: "preview" | "code" | "files", file?: string) => void;
  onGenerate: (options: GenerateOptions) => Promise<void>;
  sandboxId?: string;
  isReady: boolean;
  isGenerating: boolean;
  isApplying: boolean;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function VoiceSidebar({
  onNavigate,
  onGenerate,
  sandboxId,
  isReady,
  isGenerating,
  isApplying,
}: VoiceSidebarProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const voiceControls = useVoiceAgentControls();

  const handleNewProject = () => {
    window.location.reload();
  };

  const handleConnect = useCallback(() => {
    voiceControls.startSession();
  }, [voiceControls]);

  const handleDisconnect = useCallback(() => {
    voiceControls.endSession();
  }, [voiceControls]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const getAgentState = () => {
    if (!isReady) return "thinking" as const;
    if (isGenerating || isApplying) return "thinking" as const;
    if (isConnected) return "listening" as const;
    return null;
  };

  const getVisualizerState = () => {
    if (!isReady) return "connecting" as const;
    if (status === "connecting") return "connecting" as const;
    if (isGenerating || isApplying) return "thinking" as const;
    if (isConnected) return "listening" as const;
    return "connecting" as const;
  };

  return (
    <aside className="flex flex-col w-[400px] min-w-[400px] border-r border-border bg-sidebar">
      <header className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
        <a href="/" className="flex items-center gap-2">
          <Logo className="text-4xl" />
        </a>
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} isReady={isReady} />

          {isConnected && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "size-8 rounded-full",
                isMuted && "text-destructive hover:text-destructive"
              )}
            >
              {isMuted ? (
                <MicrophoneSlashIcon weight="fill" className="size-4" />
              ) : (
                <MicrophoneIcon weight="fill" className="size-4" />
              )}
            </Button>
          )}

          <Button
            variant={isConnected ? "destructive" : "default"}
            size="icon"
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting || !isReady}
            className="size-8 rounded-full"
          >
            {isConnecting ? (
              <CircleNotchIcon className="size-4 animate-spin" />
            ) : isConnected ? (
              <PhoneDisconnectIcon weight="fill" className="size-4" />
            ) : (
              <PhoneIcon weight="fill" className="size-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewProject}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground size-8"
          >
            <PlusIcon weight="bold" className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-56 h-56">
          <Orb
            className="w-full h-full"
            getInputVolume={voiceControls.getInputVolume}
            getOutputVolume={voiceControls.getOutputVolume}
            agentState={getAgentState()}
          />
        </div>
      </div>

      <div className="border-t border-sidebar-border px-6 py-4">
        <BarVisualizer
          state={getVisualizerState()}
          barCount={16}
          minHeight={5}
          maxHeight={40}
          className="h-10"
          demo
        />
      </div>

      <VoiceAgent
        onStatusChange={setStatus}
        onMessage={() => {}}
        onNavigate={onNavigate}
        onGenerate={onGenerate}
        sandboxId={sandboxId}
        isReady={isReady}
      />
    </aside>
  );
}

function StatusIndicator({
  status,
  isReady,
}: {
  status: ConnectionStatus;
  isReady: boolean;
}) {
  const getText = () => {
    if (!isReady) return "Setting up...";
    if (status === "connected") return "Lisa is listening";
    if (status === "connecting") return "Connecting...";
    return "Ready";
  };

  const isActive = status === "connected" && isReady;
  const isLoading = !isReady || status === "connecting";

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        isActive && "text-green-500",
        isLoading && "text-yellow-500",
        !isActive && !isLoading && "text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "size-2 rounded-full",
          isActive && "bg-green-500",
          isLoading && "bg-yellow-500 animate-pulse",
          !isActive && !isLoading && "bg-muted-foreground"
        )}
      />
      {getText()}
    </div>
  );
}
