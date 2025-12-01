import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type ChatMessageData } from "./chat-message";
import { GenerationProgress } from "./generation-progress";
import type { GeneratedFile } from "@/lib/types/ai";

interface ChatMessagesProps {
  messages: ChatMessageData[];
  isGenerating?: boolean;
  isApplying?: boolean;
  progress?: string;
  error?: string | null;
  currentFile?: string | null;
  files?: GeneratedFile[];
  packages?: string[];
}

export function ChatMessages({
  messages,
  isGenerating,
  isApplying,
  progress,
  error,
  currentFile,
  files = [],
  packages = [],
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = isGenerating || isApplying;
  const hasProgress = files.length > 0 || packages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress, files.length, packages.length, isGenerating, isApplying]);

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className="p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {(isLoading || error || hasProgress) && (
          <GenerationProgress
            isGenerating={isGenerating}
            isApplying={isApplying}
            progress={progress}
            error={error}
            currentFile={currentFile}
            files={files}
            packages={packages}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
