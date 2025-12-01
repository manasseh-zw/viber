import { useState } from "react";
import { cn } from "@/lib/utils";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { Button } from "@/components/ui/button";

interface BuilderMainProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  files: Record<string, string>;
  onRefresh: () => void;
}

type ActiveTab = "preview" | "code";

export function BuilderMain({
  sandboxUrl,
  isLoading,
  files,
  onRefresh,
}: BuilderMainProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefreshPreview = () => {
    setIframeKey((prev) => prev + 1);
    onRefresh();
  };

  const handleOpenExternal = () => {
    if (sandboxUrl) {
      window.open(sandboxUrl, "_blank");
    }
  };

  const fileList = Object.keys(files).filter(
    (f) =>
      f.startsWith("src/") ||
      f === "index.html" ||
      f.endsWith(".css") ||
      f.endsWith(".json")
  );

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
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {activeTab === "preview" && sandboxUrl && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRefreshPreview}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowClockwiseIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenExternal}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowSquareOutIcon className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                {sandboxUrl}
              </span>
            </>
          )}
        </div>
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
            fileList={fileList}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}
      </div>
    </main>
  );
}

function PreviewPanel({
  sandboxUrl,
  isLoading,
  iframeKey,
}: {
  sandboxUrl: string | null;
  isLoading: boolean;
  iframeKey: number;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <SpinnerIcon className="size-8 animate-spin text-primary" />
        <p className="text-sm">Setting up your workspace...</p>
      </div>
    );
  }

  if (!sandboxUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <EyeIcon className="size-12 opacity-50" />
        <p className="text-sm">Preview will appear here</p>
      </div>
    );
  }

  return (
    <iframe
      key={iframeKey}
      src={sandboxUrl}
      className="w-full h-full border-0 bg-white"
      title="Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}

function CodePanel({
  files,
  fileList,
  selectedFile,
  onSelectFile,
}: {
  files: Record<string, string>;
  fileList: string[];
  selectedFile: string | null;
  onSelectFile: (file: string | null) => void;
}) {
  const currentFile = selectedFile || fileList[0];
  const fileContent = currentFile ? files[currentFile] : null;

  if (fileList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <CodeIcon className="size-12 opacity-50" />
        <p className="text-sm">No files generated yet</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File tree */}
      <div className="w-56 min-w-56 border-r border-border bg-muted/30 overflow-y-auto">
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Files
          </p>
          <div className="mt-1 space-y-0.5">
            {fileList.map((file) => (
              <button
                key={file}
                onClick={() => onSelectFile(file)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm font-mono truncate transition-colors",
                  file === currentFile
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                {file}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code viewer */}
      <div className="flex-1 overflow-auto">
        {fileContent ? (
          <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap">
            <code>{fileContent}</code>
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
