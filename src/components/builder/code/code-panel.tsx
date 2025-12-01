import { useState } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { FileTree } from "./file-tree";
import { CodeViewer } from "./code-viewer";

interface CodePanelProps {
  files: Record<string, string>;
}

export function CodePanel({ files }: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fileList = Object.keys(files).filter(
    (f) =>
      f.startsWith("src/") ||
      f === "index.html" ||
      f === "package.json" ||
      f === "vite.config.ts" ||
      f === "tailwind.config.js" ||
      f === "tsconfig.json"
  );

  const currentFile = selectedFile || fileList[0];
  const fileContent = currentFile ? files[currentFile] : null;

  if (fileList.length === 0) {
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

  return (
    <div className="flex h-full">
      <FileTree
        files={fileList}
        selectedFile={currentFile}
        onSelectFile={setSelectedFile}
      />
      <CodeViewer fileName={currentFile} content={fileContent} />
    </div>
  );
}
