import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { SandboxIframe } from "./sandbox-iframe";

interface PreviewPanelProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  iframeKey?: number;
}

export function PreviewPanel({
  sandboxUrl,
  isLoading,
  iframeKey = 0,
}: PreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="relative">
          <SpinnerIcon className="size-10 animate-spin text-primary" />
          <div className="absolute inset-0 animate-ping opacity-30">
            <SpinnerIcon className="size-10 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Setting up your workspace...</p>
          <p className="text-xs opacity-70">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!sandboxUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="p-4 rounded-full bg-muted/50">
          <EyeIcon className="size-10 opacity-50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Preview will appear here</p>
          <p className="text-xs opacity-70">
            Describe what you want to build to get started
          </p>
        </div>
      </div>
    );
  }

  return <SandboxIframe url={sandboxUrl} refreshKey={iframeKey} />;
}

