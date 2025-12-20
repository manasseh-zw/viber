import { Button } from "@/components/ui/button";
import { Microphone } from "@phosphor-icons/react/dist/csr/Microphone";
import { MicrophoneSlash } from "@phosphor-icons/react/dist/csr/MicrophoneSlash";
import { PhoneDisconnect } from "@phosphor-icons/react/dist/csr/PhoneDisconnect";
import { Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
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
            <MicrophoneSlash weight="fill" className="size-5" />
          ) : (
            <Microphone weight="fill" className="size-5" />
          )}
        </Button>
      )}

      <Button
        variant={isConnected ? "destructive" : "default"}
        size="icon"
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={cn(
          "rounded-full size-14 transition-all",
          !isConnected && !isConnecting && "bg-primary hover:bg-primary/90"
        )}
      >
        {isConnecting ? (
          <CircleNotch className="size-6 animate-spin" />
        ) : isConnected ? (
          <PhoneDisconnect weight="fill" className="size-6" />
        ) : (
          <Phone weight="fill" className="size-6" />
        )}
      </Button>

      {isConnected && <div className="size-12" />}
    </div>
  );
}
