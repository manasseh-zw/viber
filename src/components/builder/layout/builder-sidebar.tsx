import { useState } from "react";
import { Logo } from "@/components/logo";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "../chat/chat-messages";
import { ChatInput } from "../chat/chat-input";
import type { ChatMessageData } from "../chat/chat-message";
import type { GeneratedFile } from "@/lib/types/ai";

interface BuilderSidebarProps {
  onSendMessage: (message: string) => void;
  onCancelGeneration?: () => void;
  isGenerating: boolean;
  isApplying: boolean;
  isSandboxCreating: boolean;
  progress: string;
  error: string | null;
  currentFile?: string | null;
  files?: GeneratedFile[];
  packages?: string[];
}

export function BuilderSidebar({
  onSendMessage,
  onCancelGeneration,
  isGenerating,
  isApplying,
  isSandboxCreating,
  progress,
  error,
  currentFile,
  files = [],
  packages = [],
}: BuilderSidebarProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "system-1",
      role: "system",
      content: "Welcome to Viber! Describe the website you want to build.",
      timestamp: new Date(),
    },
  ]);

  const isLoading = isGenerating || isApplying || isSandboxCreating;

  const handleSubmit = (message: string) => {
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    onSendMessage(message);
  };

  const handleNewProject = () => {
    window.location.reload();
  };

  return (
    <aside className="flex flex-col w-[400px] min-w-[400px] border-r border-border bg-sidebar">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-[7px] border-b border-sidebar-border">
        <a href="/" className="flex items-center gap-2 group">
          <Logo className="text-4xl"/>
        </a>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNewProject}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <PlusIcon weight="bold" className="size-4" />
        </Button>
      </header>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        isGenerating={isGenerating}
        isApplying={isApplying}
        progress={progress}
        error={error}
        currentFile={currentFile}
        files={files}
        packages={packages}
      />

      {/* Input */}
      <ChatInput
        onSubmit={handleSubmit}
        onCancel={onCancelGeneration}
        isLoading={isLoading}
        isGenerating={isGenerating}
        placeholder={
          isSandboxCreating
            ? "Setting up your workspace..."
            : "Describe what you want to build..."
        }
        disabled={isSandboxCreating}
      />
    </aside>
  );
}
