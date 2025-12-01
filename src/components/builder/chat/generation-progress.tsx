import { cn } from "@/lib/utils";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { FileCodeIcon } from "@phosphor-icons/react/dist/csr/FileCode";

interface GenerationProgressProps {
  isLoading?: boolean;
  progress?: string;
  error?: string | null;
  currentFile?: string | null;
}

export function GenerationProgress({
  isLoading,
  progress,
  error,
  currentFile,
}: GenerationProgressProps) {
  if (error) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 text-destructive text-sm animate-fade-in">
        <WarningIcon weight="fill" className="size-5 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Something went wrong</p>
          <p className="opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoading) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-3 text-sm text-sidebar-foreground/70">
        <div className="relative">
          <SpinnerIcon className="size-5 animate-spin text-primary" />
          <div className="absolute inset-0 animate-ping">
            <SpinnerIcon className="size-5 text-primary/30" />
          </div>
        </div>
        <span className="font-medium">{progress || "Working..."}</span>
      </div>

      {currentFile && (
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50 pl-8">
          <FileCodeIcon weight="duotone" className="size-4" />
          <span className="font-mono">{currentFile}</span>
        </div>
      )}

      <div className="pl-8">
        <div className="h-1 bg-sidebar-accent rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-primary rounded-full",
              "animate-pulse transition-all duration-300"
            )}
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}

