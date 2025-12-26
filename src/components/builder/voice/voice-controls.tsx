import { Button } from "@/components/ui/button";
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneIcon,
} from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface VoiceControlsProps {
  status: ConnectionStatus;
  isMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
}

export function VoiceControls({
  status,
  isMuted,
  onConnect,
  onDisconnect,
  onToggleMute,
}: VoiceControlsProps) {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex items-center justify-center gap-3">
      {isConnected && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          className={cn(
            "rounded-full size-12",
            isMuted && "text-destructive hover:text-destructive"
          )}
        >
          {isMuted ? (
            <MicrophoneSlashIcon weight="fill" className="size-5" />
          ) : (
            <MicrophoneIcon weight="fill" className="size-5" />
          )}
        </Button>
      )}

      <Button
        variant="default"
        size="icon"
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={cn(
          "rounded-full size-14 transition-all",
          isConnected
            ? "bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white"
            : "bg-primary hover:bg-primary/90"
        )}
      >
        {isConnecting ? (
          <Spinner className="size-6" />
        ) : (
          <PhoneIcon weight="fill" className="size-6" />
        )}
      </Button>

      {isConnected && <div className="size-12" />}
    </div>
  );
}
