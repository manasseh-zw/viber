import { useState, useMemo, useEffect, useRef } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { FileTree } from "./file-tree";
import { CodeViewer } from "./code-viewer";
import { StreamingCodeViewer } from "./streaming-code-viewer";
import type { StreamingFile } from "@/lib/hooks/use-generation";

interface CodePanelProps {
  files: Record<string, string>;
  isStreaming?: boolean;
  currentFile?: StreamingFile | null;
  streamingFiles?: StreamingFile[];
}

export function CodePanel({
  files,
  isStreaming = false,
  currentFile = null,
  streamingFiles = [],
}: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [userSelectedDuringStream, setUserSelectedDuringStream] = useState(false);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      setUserSelectedDuringStream(false);
      setSelectedFile(null);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const sandboxFileList = useMemo(
    () =>
      Object.keys(files).filter(
        (f) =>
          f.startsWith("src/") ||
          f === "index.html" ||
          f === "package.json" ||
          f === "vite.config.ts" ||
          f === "tailwind.config.js" ||
          f === "tsconfig.json"
      ),
    [files]
  );

  const streamingFileList = useMemo(
    () => streamingFiles.map((f) => f.path),
    [streamingFiles]
  );

  const hasActiveStreaming = isStreaming && (currentFile || streamingFiles.length > 0);
  const hasSandboxFiles = sandboxFileList.length > 0;

  const showStreamingView = hasActiveStreaming && !userSelectedDuringStream;

  const fileList = hasActiveStreaming && !hasSandboxFiles
    ? [...new Set([...(currentFile ? [currentFile.path] : []), ...streamingFileList])]
    : sandboxFileList;

  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    if (isStreaming) {
      setUserSelectedDuringStream(true);
    }
  };

  const getFileContent = (filePath: string): string | null => {
    if (currentFile?.path === filePath) {
      return currentFile.content;
    }
    const streamFile = streamingFiles.find((f) => f.path === filePath);
    if (streamFile) return streamFile.content;

    return files[filePath] ?? null;
  };

  if (fileList.length === 0 && !hasActiveStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="p-4 rounded-full bg-muted/50">
          <CodeIcon className="size-10 opacity-50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No files generated yet</p>
          <p className="text-xs opacity-70">
            Files will appear here after generation
          </p>
        </div>
      </div>
    );
  }

  if (showStreamingView) {
    return (
      <div className="flex h-full">
        <FileTree
          files={fileList}
          selectedFile={currentFile?.path ?? null}
          onSelectFile={handleSelectFile}
          isStreaming={isStreaming}
          currentStreamingFile={currentFile?.path}
        />
        <StreamingCodeViewer
          currentFile={currentFile}
          completedFiles={streamingFiles}
          isStreaming={isStreaming}
        />
      </div>
    );
  }

  const activeFilePath = selectedFile || currentFile?.path || fileList[0];
  const fileContent = activeFilePath ? getFileContent(activeFilePath) : null;
  const isActiveFileStreaming = isStreaming && currentFile?.path === activeFilePath;

  return (
    <div className="flex h-full">
      <FileTree
        files={fileList}
        selectedFile={activeFilePath}
        onSelectFile={handleSelectFile}
        isStreaming={isStreaming}
        currentStreamingFile={currentFile?.path}
      />
      <CodeViewer
        fileName={activeFilePath}
        content={fileContent}
        isStreaming={isActiveFileStreaming}
      />
    </div>
  );
}
