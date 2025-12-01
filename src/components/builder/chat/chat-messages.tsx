import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type ChatMessageData } from "./chat-message";
import { GenerationProgress } from "./generation-progress";

interface ChatMessagesProps {
  messages: ChatMessageData[];
  isLoading?: boolean;
  progress?: string;
  error?: string | null;
  currentFile?: string | null;
}

export function ChatMessages({
  messages,
  isLoading,
  progress,
  error,
  currentFile,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, progress]);

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className="p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {(isLoading || error) && (
          <GenerationProgress
            isLoading={isLoading}
            progress={progress}
            error={error}
            currentFile={currentFile}
          />
        )}
      </div>
    </ScrollArea>
  );
}
