"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { StreamingFile } from "@/lib/hooks/use-generation";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import type { BundledLanguage } from "shiki";
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockItem,
} from "@/components/kibo-ui/code-block";

interface StreamingCodeViewerProps {
  currentFile: StreamingFile | null;
  completedFiles: StreamingFile[];
}

function getLanguage(fileName: string): BundledLanguage {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "css":
      return "css";
    case "html":
      return "html";
    case "json":
      return "json";
    default:
      return "typescript";
  }
}

function CurrentFileBlock({ file }: { file: StreamingFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(false);
  const lineCount = file.content.split("\n").length;
  const language = getLanguage(file.path);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [file.content]);

  useEffect(() => {
    if (file.content.length < 100) {
      setSyntaxHighlighting(false);
      return;
    }
    const timeout = setTimeout(() => {
      setSyntaxHighlighting(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [file.content]);

  const data = useMemo(
    () => [{ language, filename: file.path, code: file.content }],
    [language, file.path, file.content]
  );

  return (
    <div className="rounded-lg overflow-hidden border-2 border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <CircleNotch className="size-5 text-primary animate-spin" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-primary" />
            </span>
          </div>
          <span className="text-sm font-mono text-foreground font-semibold">
            {file.path}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded font-bold uppercase tracking-wide">
            Live
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto max-h-[60vh] min-h-[200px] bg-background"
      >
        <CodeBlock
          key={file.path}
          data={data}
          defaultValue={language}
          className="h-full rounded-none border-0"
        >
          <CodeBlockBody>
            {() => (
              <CodeBlockItem value={language} lineNumbers className="relative">
                <CodeBlockContent
                  language={language}
                  syntaxHighlighting={syntaxHighlighting}
                >
                  {file.content}
                </CodeBlockContent>
                <span className="absolute bottom-4 right-4 inline-block w-2.5 h-6 bg-primary animate-pulse rounded-sm" />
              </CodeBlockItem>
            )}
          </CodeBlockBody>
        </CodeBlock>
      </div>
    </div>
  );
}

function CompletedFileBlock({ file }: { file: StreamingFile }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const lineCount = file.content.split("\n").length;
  const language = getLanguage(file.path);

  const data = useMemo(
    () => [{ language, filename: file.path, code: file.content }],
    [language, file.path, file.content]
  );

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-background/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-secondary/50 hover:bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <CaretDown className="size-4 text-muted-foreground" />
          ) : (
            <CaretRight className="size-4 text-muted-foreground" />
          )}
          <CheckCircle weight="fill" className="size-4 text-green-500" />
          <span className="text-xs font-mono text-foreground font-medium">
            {file.path}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </button>

      {isExpanded && (
        <div className="overflow-auto max-h-[300px] border-t border-border/30">
          <CodeBlock
            key={file.path}
            data={data}
            defaultValue={language}
            className="h-full rounded-none border-0"
          >
            <CodeBlockBody>
              {() => (
                <CodeBlockItem value={language} lineNumbers>
                  <CodeBlockContent language={language}>
                    {file.content}
                  </CodeBlockContent>
                </CodeBlockItem>
              )}
            </CodeBlockBody>
          </CodeBlock>
        </div>
      )}
    </div>
  );
}

export function StreamingCodeViewer({
  currentFile,
  completedFiles,
}: StreamingCodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && (currentFile || completedFiles.length > 0)) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [currentFile?.content, currentFile?.path, completedFiles.length]);

  if (!currentFile && completedFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="relative inline-flex">
            <CircleNotch className="size-10 animate-spin text-primary" />
            <span className="absolute top-0 right-0 flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-primary" />
            </span>
          </div>
          <p className="text-sm font-medium">Generating code...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-3">
      {currentFile && (
        <CurrentFileBlock
          key={`current-${currentFile.path}`}
          file={currentFile}
        />
      )}

      {completedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <CheckCircle weight="fill" className="size-3.5 text-green-500" />
            <span className="font-medium">
              {completedFiles.length} file
              {completedFiles.length !== 1 ? "s" : ""} completed
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="space-y-1.5">
            {completedFiles.map((file) => (
              <CompletedFileBlock key={file.path} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
