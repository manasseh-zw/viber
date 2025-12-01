import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Describe what you want to build...",
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || isLoading;

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isDisabled) return;

    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-sidebar-border">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={3}
          className={cn(
            "w-full min-h-[80px] max-h-[200px] resize-none rounded-xl",
            "bg-sidebar-accent/50 border border-sidebar-border",
            "px-4 py-3 pr-24",
            "text-sidebar-foreground placeholder:text-sidebar-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground/50 hover:text-primary"
            disabled={isDisabled}
          >
            <MicrophoneIcon weight="fill" className="size-5" />
          </Button>
          <Button
            type="submit"
            size="icon-sm"
            disabled={!input.trim() || isDisabled}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <SpinnerIcon className="size-4 animate-spin" />
            ) : (
              <PaperPlaneTiltIcon weight="fill" className="size-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-sidebar-foreground/50 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}

