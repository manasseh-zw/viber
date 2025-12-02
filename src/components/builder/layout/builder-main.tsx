import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { PreviewPanel } from "../preview/preview-panel";
import { PreviewToolbar } from "../preview/preview-toolbar";
import { CodePanel } from "../code";
import type { StreamingFile } from "@/lib/hooks/use-generation";

interface BuilderMainProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  files: Record<string, string>;
  onRefresh: () => void;
  isStreaming?: boolean;
  currentFile?: StreamingFile | null;
  streamingFiles?: StreamingFile[];
}

type ActiveTab = "preview" | "code";

export function BuilderMain({
  sandboxUrl,
  isLoading,
  files,
  onRefresh,
  isStreaming = false,
  currentFile = null,
  streamingFiles = [],
}: BuilderMainProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (isStreaming && activeTab === "preview") {
      setActiveTab("code");
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && streamingFiles.length > 0 && activeTab === "code") {
      const timer = setTimeout(() => setActiveTab("preview"), 1500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, streamingFiles.length]);

  const handleRefreshPreview = () => {
    setIframeKey((prev) => prev + 1);
    onRefresh();
  };

  const hasStreamingContent = isStreaming || streamingFiles.length > 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Tab bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <EyeIcon
              weight={activeTab === "preview" ? "fill" : "regular"}
              className="size-4"
            />
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
              activeTab === "code"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <CodeIcon
              weight={activeTab === "code" ? "fill" : "regular"}
              className="size-4"
            />
            Code
            {isStreaming && activeTab !== "code" && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
              </span>
            )}
          </button>
        </div>

        {/* Toolbar */}
        {activeTab === "preview" && (
          <PreviewToolbar url={sandboxUrl} onRefresh={handleRefreshPreview} />
        )}
        {activeTab === "code" && isStreaming && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-primary" />
            </span>
            Generating code...
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <PreviewPanel
            sandboxUrl={sandboxUrl}
            isLoading={isLoading}
            iframeKey={iframeKey}
          />
        ) : (
          <CodePanel
            files={files}
            isStreaming={isStreaming}
            currentFile={currentFile}
            streamingFiles={streamingFiles}
          />
        )}
      </div>
    </main>
  );
}
