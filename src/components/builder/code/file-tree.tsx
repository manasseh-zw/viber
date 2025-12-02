import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { FileJsIcon } from "@phosphor-icons/react/dist/csr/FileJs";
import { FileTsIcon } from "@phosphor-icons/react/dist/csr/FileTs";
import { FileCssIcon } from "@phosphor-icons/react/dist/csr/FileCss";
import { FileHtmlIcon } from "@phosphor-icons/react/dist/csr/FileHtml";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";

interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  isStreaming?: boolean;
  currentStreamingFile?: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
      return <FileJsIcon weight="duotone" className="size-4 text-yellow-500" />;
    case "ts":
    case "tsx":
      return <FileTsIcon weight="duotone" className="size-4 text-blue-500" />;
    case "css":
      return (
        <FileCssIcon weight="duotone" className="size-4 text-purple-500" />
      );
    case "html":
      return (
        <FileHtmlIcon weight="duotone" className="size-4 text-orange-500" />
      );
    case "json":
      return <FileIcon weight="duotone" className="size-4 text-green-500" />;
    case "md":
      return <FileIcon weight="duotone" className="size-4 text-slate-400" />;
    default:
      return (
        <FileIcon weight="duotone" className="size-4 text-muted-foreground" />
      );
  }
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  const sortedFiles = [...files].sort((a, b) => {
    const aDepth = a.split("/").length;
    const bDepth = b.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.localeCompare(b);
  });

  for (const filePath of sortedFiles) {
    const parts = filePath.split("/");
    let currentPath = "";
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        currentLevel.push({
          name: part,
          path: filePath,
          type: "file",
        });
      } else {
        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: "folder",
            children: [],
          };
          folderMap.set(currentPath, folder);
          currentLevel.push(folder);
        }
        currentLevel = folder.children!;
      }
    }
  }

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  function sortTree(nodes: TreeNode[]): TreeNode[] {
    const sorted = sortNodes(nodes);
    for (const node of sorted) {
      if (node.children) {
        node.children = sortTree(node.children);
      }
    }
    return sorted;
  }

  return sortTree(root);
}

function TreeNodeItem({
  node,
  selectedFile,
  onSelectFile,
  depth = 0,
  defaultExpanded = true,
  isStreaming = false,
  currentStreamingFile = null,
}: {
  node: TreeNode;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  depth?: number;
  defaultExpanded?: boolean;
  isStreaming?: boolean;
  currentStreamingFile?: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isCurrentlyStreaming =
    isStreaming && currentStreamingFile === node.path;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <CaretDownIcon className="size-3.5 shrink-0" />
          ) : (
            <CaretRightIcon className="size-3.5 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpenIcon
              weight="duotone"
              className="size-4 text-amber-500"
            />
          ) : (
            <FolderIcon weight="duotone" className="size-4 text-amber-500" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
                defaultExpanded={depth < 1}
                isStreaming={isStreaming}
                currentStreamingFile={currentStreamingFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-all",
        isCurrentlyStreaming
          ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm"
          : node.path === selectedFile
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isCurrentlyStreaming ? (
        <div className="relative shrink-0">
          <CircleNotchIcon className="size-3.5 animate-spin text-primary" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-primary" />
          </span>
        </div>
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      {getFileIcon(node.name)}
      <span
        className={cn(
          "truncate font-mono text-xs",
          isCurrentlyStreaming && "font-semibold"
        )}
      >
        {node.name}
      </span>
      {isCurrentlyStreaming && (
        <span className="ml-auto text-[9px] px-1 py-0.5 bg-primary/20 text-primary rounded font-medium uppercase tracking-wide">
          Live
        </span>
      )}
    </button>
  );
}

export function FileTree({
  files,
  selectedFile,
  onSelectFile,
  isStreaming = false,
  currentStreamingFile = null,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="w-60 min-w-60 border-r border-border bg-muted/20 overflow-y-auto">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Files
          </p>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[10px] text-primary font-semibold">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-primary" />
              </span>
              Streaming
            </span>
          )}
        </div>

        {/* Current streaming file - shown at top with highlight */}
        {isStreaming && currentStreamingFile && (
          <div className="mb-2 px-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 px-2">
              Currently generating
            </div>
            <div className="flex items-center gap-1.5 px-2 py-2 text-sm rounded-md bg-primary/20 text-primary ring-2 ring-primary/40 shadow-md">
              <div className="relative shrink-0">
                <CircleNotchIcon className="size-4 animate-spin text-primary" />
                <span className="absolute -top-0.5 -right-0.5 flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-primary" />
                </span>
              </div>
              {getFileIcon(
                currentStreamingFile.split("/").pop() || currentStreamingFile
              )}
              <span className="truncate font-mono text-xs font-bold">
                {currentStreamingFile.split("/").pop()}
              </span>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded font-bold uppercase">
                Live
              </span>
            </div>
          </div>
        )}

        {/* Divider */}
        {isStreaming && currentStreamingFile && files.length > 1 && (
          <div className="flex items-center gap-2 px-2 py-1 mb-1">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[10px] text-muted-foreground">All files</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
        )}

        <div className="mt-1">
          {tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              isStreaming={isStreaming}
              currentStreamingFile={currentStreamingFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
