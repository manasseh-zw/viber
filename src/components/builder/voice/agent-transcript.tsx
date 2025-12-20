import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { cn } from "@/lib/utils";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentTranscriptProps {
  messages: AgentMessage[];
  className?: string;
}

export function AgentTranscript({ messages, className }: AgentTranscriptProps) {
  return (
    <Conversation className={cn("flex-1 overflow-hidden", className)}>
      <ConversationContent className="flex flex-col gap-3 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">Lisa is ready to help you build.</p>
            <p className="text-xs mt-1">Just start talking!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <TranscriptMessage key={index} message={message} />
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

function TranscriptMessage({ message }: { message: AgentMessage }) {
  if (message.role !== "assistant") return null;

  return (
    <div className="flex items-start gap-3">
      <div className="size-6 rounded-full bg-primary/20 flex-shrink-0 mt-0.5 flex items-center justify-center">
        <span className="text-xs font-medium text-primary">L</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">
          {message.content}
        </p>
        <span className="text-xs text-muted-foreground mt-1 block">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
