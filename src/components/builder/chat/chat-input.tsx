import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  onCancel,
  isLoading,
  isGenerating,
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isDisabled) return;

    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && isGenerating) {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-t border-sidebar-border"
    >
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
          {isGenerating ? (
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={handleCancel}
              className="bg-destructive/90 hover:bg-destructive"
            >
              <StopIcon weight="fill" className="size-4" />
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-sidebar-foreground/50">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-sidebar-accent/70 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to send
        </span>
        <span className="text-sidebar-foreground/30">•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-sidebar-accent/70 font-mono text-[10px]">
            Shift+Enter
          </kbd>{" "}
          new line
        </span>
        {isGenerating && (
          <>
            <span className="text-sidebar-foreground/30">•</span>
            <span className="text-destructive/70">
              <kbd className="px-1.5 py-0.5 rounded bg-destructive/20 font-mono text-[10px]">
                Esc
              </kbd>{" "}
              to cancel
            </span>
          </>
        )}
      </div>
    </form>
  );
}
