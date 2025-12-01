import { cn } from "@/lib/utils";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { FileCodeIcon } from "@phosphor-icons/react/dist/csr/FileCode";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { PackageIcon } from "@phosphor-icons/react/dist/csr/Package";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { GearIcon } from "@phosphor-icons/react/dist/csr/Gear";
import type { GeneratedFile } from "@/lib/types/ai";

interface GenerationProgressProps {
  isGenerating?: boolean;
  isApplying?: boolean;
  progress?: string;
  error?: string | null;
  currentFile?: string | null;
  files?: GeneratedFile[];
  packages?: string[];
}

type FileStatus = "pending" | "generating" | "complete";
type PackageStatus = "pending" | "installing" | "installed";

function getFileStatus(
  filePath: string,
  currentFile: string | null | undefined,
  isApplying: boolean
): FileStatus {
  if (isApplying) return "complete";
  if (currentFile === filePath) return "generating";
  return "complete";
}

function FileItem({
  file,
  status,
}: {
  file: GeneratedFile;
  status: FileStatus;
}) {
  const fileName = file.path.split("/").pop() || file.path;

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 transition-all",
        status === "generating" && "animate-pulse"
      )}
    >
      {status === "complete" ? (
        <CheckCircleIcon
          weight="fill"
          className="size-3.5 text-green-500 shrink-0"
        />
      ) : status === "generating" ? (
        <CircleNotchIcon className="size-3.5 text-primary animate-spin shrink-0" />
      ) : (
        <div className="size-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
      )}
      <span
        className={cn(
          "text-xs font-mono truncate",
          status === "complete"
            ? "text-sidebar-foreground/70"
            : "text-sidebar-foreground"
        )}
      >
        {fileName}
      </span>
    </div>
  );
}

function PackageItem({
  name,
  status,
}: {
  name: string;
  status: PackageStatus;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 transition-all",
        status === "installing" && "animate-pulse"
      )}
    >
      {status === "installed" ? (
        <CheckCircleIcon
          weight="fill"
          className="size-3.5 text-green-500 shrink-0"
        />
      ) : status === "installing" ? (
        <CircleNotchIcon className="size-3.5 text-primary animate-spin shrink-0" />
      ) : (
        <div className="size-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
      )}
      <span
        className={cn(
          "text-xs font-mono truncate",
          status === "installed"
            ? "text-sidebar-foreground/70"
            : "text-sidebar-foreground"
        )}
      >
        {name}
      </span>
    </div>
  );
}

export function GenerationProgress({
  isGenerating,
  isApplying,
  progress,
  error,
  currentFile,
  files = [],
  packages = [],
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

  const isLoading = isGenerating || isApplying;
  if (!isLoading && files.length === 0 && packages.length === 0) return null;

  const showFiles = files.length > 0;
  const showPackages = packages.length > 0;
  const isComplete = !isLoading && (showFiles || showPackages);

  return (
    <div className="space-y-4 animate-fade-in p-3 rounded-xl bg-sidebar-accent/30 border border-sidebar-border">
      {/* Status Header */}
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="relative">
            <SpinnerIcon className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <CheckCircleIcon weight="fill" className="size-5 text-green-500" />
        )}
        <span className="text-sm font-medium text-sidebar-foreground">
          {isComplete ? "Generation complete" : progress || "Working..."}
        </span>
      </div>

      {/* Current File Indicator */}
      {currentFile && isGenerating && (
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70 pl-8">
          <FileCodeIcon weight="duotone" className="size-4" />
          <span className="font-mono truncate">{currentFile}</span>
        </div>
      )}

      {/* Files Section */}
      {showFiles && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            <FileCodeIcon weight="bold" className="size-3.5" />
            <span>Files ({files.length})</span>
          </div>
          <div className="pl-1 space-y-0.5 max-h-32 overflow-y-auto">
            {files.map((file) => (
              <FileItem
                key={file.path}
                file={file}
                status={getFileStatus(file.path, currentFile, !!isApplying)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Packages Section */}
      {showPackages && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            <PackageIcon weight="bold" className="size-3.5" />
            <span>Packages ({packages.length})</span>
          </div>
          <div className="pl-1 space-y-0.5">
            {packages.map((pkg) => (
              <PackageItem
                key={pkg}
                name={pkg}
                status={isApplying ? "installing" : "installed"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Applying Status */}
      {isApplying && (
        <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/50">
          <GearIcon
            weight="fill"
            className="size-4 text-primary animate-spin"
          />
          <span className="text-xs text-sidebar-foreground/70">
            Applying changes to sandbox...
          </span>
        </div>
      )}
    </div>
  );
}
