import { useState, useEffect } from "react";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { PreviewPanel } from "../preview/preview-panel";
import { PreviewToolbar } from "../preview/preview-toolbar";
import { CodePanel } from "../code";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlowingBorder } from "@/components/ui/glowing-border";
import type { StreamingFile } from "@/lib/hooks/use-generation";

interface BuilderMainProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  isApplying?: boolean;
  files: Record<string, string>;
  onRefresh: () => void;
  isGenerating?: boolean;
  isStreaming?: boolean;
  currentFile?: StreamingFile | null;
  streamingFiles?: StreamingFile[];
}

type ActiveTab = "preview" | "code";

export function BuilderMain({
  sandboxUrl,
  isLoading,
  isApplying = false,
  files,
  onRefresh,
  isGenerating = false,
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

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-background">
      <GlowingBorder active={isGenerating}>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActiveTab)}
          className="flex-1 flex flex-col overflow-hidden gap-0"
        >
          {/* Tab bar */}
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <TabsList>
              <TabsTrigger value="preview" className="gap-2">
                <EyeIcon
                  weight={activeTab === "preview" ? "fill" : "regular"}
                  color={activeTab === "preview" ? "var(--color-primary)" : ""}
                  className="size-4"
                />
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2 relative">
                <CodeIcon
                  weight={activeTab === "code" ? "fill" : "regular"}
                  color={activeTab === "code" ? "var(--color-primary)" : ""}
                  className="size-4"
                />
                {isStreaming && activeTab !== "code" && (
                  <span className="absolute -top-1 -right-1 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {activeTab === "preview" && (
              <PreviewToolbar
                url={sandboxUrl}
                onRefresh={handleRefreshPreview}
              />
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

          <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
            <PreviewPanel
              sandboxUrl={sandboxUrl}
              isLoading={isLoading}
              isApplying={isApplying}
              iframeKey={iframeKey}
            />
          </TabsContent>
          <TabsContent value="code" className="flex-1 overflow-hidden m-0">
            <CodePanel
              files={files}
              isStreaming={isStreaming}
              currentFile={currentFile}
              streamingFiles={streamingFiles}
            />
          </TabsContent>
        </Tabs>
      </GlowingBorder>
    </main>
  );
}
