import { useState, useCallback } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Orb } from "@/components/ui/orb";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { VoiceAgent, useVoiceAgentControls } from "./voice-agent";
import { AgentTranscript } from "./agent-transcript";
import { VoiceControls } from "./voice-controls";
import { cn } from "@/lib/utils";
import type { GenerateOptions } from "@/lib/hooks/use-generation";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

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
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const voiceControls = useVoiceAgentControls();

  const handleNewProject = () => {
    window.location.reload();
  };

  const handleMessage = useCallback((message: AgentMessage) => {
    if (message.role === "assistant") {
      setMessages((prev) => [...prev, message]);
    }
  }, []);

  const handleConnect = useCallback(() => {
    voiceControls.startSession();
  }, [voiceControls]);

  const handleDisconnect = useCallback(() => {
    voiceControls.endSession();
  }, [voiceControls]);

  const getAgentState = () => {
    if (isGenerating || isApplying) return "thinking" as const;
    if (status === "connected") return "listening" as const;
    return null;
  };

  const getVisualizerState = () => {
    if (status === "connecting") return "connecting" as const;
    if (isGenerating || isApplying) return "thinking" as const;
    if (status === "connected") return "listening" as const;
    return "connecting" as const;
  };

  return (
    <aside className="flex flex-col w-[400px] min-w-[400px] border-r border-border bg-sidebar">
      <header className="flex items-center justify-between px-4 py-[7px] border-b border-sidebar-border">
        <a href="/" className="flex items-center gap-2">
          <Logo className="text-4xl" />
        </a>
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewProject}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground size-8"
          >
            <Plus weight="bold" className="size-4" />
          </Button>
        </div>
      </header>

      <div
        className={cn(
          "flex items-center justify-center transition-all duration-500",
          status === "connected" ? "h-32 py-4" : "flex-1 py-8"
        )}
      >
        <Orb
          className={cn(
            "transition-all duration-500",
            status === "connected" ? "size-24" : "size-48"
          )}
          getInputVolume={voiceControls.getInputVolume}
          getOutputVolume={voiceControls.getOutputVolume}
          agentState={getAgentState()}
        />
      </div>

      {status === "connected" && (
        <AgentTranscript messages={messages} className="flex-1 min-h-0" />
      )}

      <div className="border-t border-sidebar-border p-4">
        <BarVisualizer
          state={getVisualizerState()}
          barCount={12}
          className="h-8 mb-4"
          demo
        />
        <VoiceControls
          status={status}
          isMuted={isMuted}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      </div>

      <VoiceAgent
        onStatusChange={setStatus}
        onMessage={handleMessage}
        onNavigate={onNavigate}
        onGenerate={onGenerate}
        sandboxId={sandboxId}
        isReady={isReady}
        isMuted={isMuted}
      />
    </aside>
  );
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        status === "connected" && "text-green-500",
        status === "connecting" && "text-yellow-500",
        status === "disconnected" && "text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-green-500",
          status === "connecting" && "bg-yellow-500 animate-pulse",
          status === "disconnected" && "bg-muted-foreground"
        )}
      />
      {status === "connected"
        ? "Lisa is listening"
        : status === "connecting"
          ? "Connecting..."
          : "Tap to start"}
    </div>
  );
}
