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

interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
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
}: {
  node: TreeNode;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
        "w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors",
        node.path === selectedFile
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="size-3.5 shrink-0" />
      {getFileIcon(node.name)}
      <span className="truncate font-mono text-xs">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="w-60 min-w-60 border-r border-border bg-muted/20 overflow-y-auto">
      <div className="p-2">
        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Files
        </p>
        <div className="mt-1">
          {tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
