import { useState, useCallback, Suspense } from "react";
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

  const getStatusText = () => {
    if (!isReady) return "Setting up workspace...";
    if (isGenerating) return "Generating code...";
    if (isApplying) return "Applying changes...";
    if (status === "connected") return "Lisa is listening";
    if (status === "connecting") return "Connecting...";
    return "Ready to start";
  };

  return (
    <aside className="flex flex-col w-[400px] min-w-[400px] border-r border-border bg-sidebar">
      <header className="flex items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center gap-2">
          <Logo className="text-4xl" />
        </a>
        <div className="flex items-center gap-2">
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
            variant="ghost"
            size="icon"
            onClick={handleNewProject}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground size-8"
          >
            <PlusIcon weight="bold" className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center pb-12 px-8">
        <div className="w-48 h-48">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse" />
              </div>
            }
          >
            <Orb
              className="w-full h-full"
              colors={["#FFF8F2", "#FF8C42"]}
              getInputVolume={voiceControls.getInputVolume}
              getOutputVolume={voiceControls.getOutputVolume}
              agentState={getAgentState()}
            />
          </Suspense>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <Button
            variant={isConnected ? "outline" : "outline"}
            size="icon"
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting || !isReady}
            className={cn(
              "size-12 rounded-full",
              isConnected &&
                "border-destructive text-destructive hover:bg-destructive/10"
            )}
          >
            {isConnecting ? (
              <CircleNotchIcon className="size-5 animate-spin" />
            ) : isConnected ? (
              <PhoneDisconnectIcon weight="fill" className="size-5" />
            ) : (
              <PhoneIcon weight="fill" className="size-5" />
            )}
          </Button>

          <p className="text-sm text-muted-foreground">{getStatusText()}</p>
        </div>
      </div>

      <BarVisualizer
        state={getVisualizerState()}
        barCount={36}
        minHeight={8}
        maxHeight={100}
        className="h-24"
        demo
      />

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
