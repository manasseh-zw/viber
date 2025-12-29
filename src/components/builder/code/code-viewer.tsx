"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import type { BundledLanguage } from "shiki";
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockItem,
} from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  fileName: string | null;
  content: string | null;
  isStreaming?: boolean;
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
    case "md":
      return "markdown";
    case "svg":
      return "xml";
    default:
      return "typescript";
  }
}

export function CodeViewer({
  fileName,
  content,
  isStreaming = false,
}: CodeViewerProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(!isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setSyntaxHighlighting(false);
      const timeout = setTimeout(() => {
        setSyntaxHighlighting(true);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setSyntaxHighlighting(true);
    }
  }, [isStreaming, content]);

  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  const data = useMemo(() => {
    if (!fileName || content === null) return [];
    return [
      {
        language: getLanguage(fileName),
        filename: fileName,
        code: content,
      },
    ];
  }, [fileName, content]);

  if (!fileName || content === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a file to view its contents</p>
      </div>
    );
  }

  const language = getLanguage(fileName);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CodeBlock
        key={fileName}
        data={data}
        defaultValue={language}
        className={cn(
          "h-full rounded-none border-0 bg-background flex flex-col",
          isStreaming && "ring-1 ring-primary/30"
        )}
      >
        <CodeBlockHeader
          className={cn(
            "px-4 py-2 bg-secondary/50",
            isStreaming && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-2 flex-1">
            {isStreaming && (
              <CircleNotch className="size-3.5 animate-spin text-primary" />
            )}
            <CodeBlockFilename value={language}>{fileName}</CodeBlockFilename>
            {isStreaming && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium">
                Streaming
              </span>
            )}
          </div>
          <CodeBlockCopyButton className="size-8" />
        </CodeBlockHeader>

        <div ref={codeRef} className="flex-1 overflow-auto">
          <CodeBlockBody>
            {() => (
              <CodeBlockItem value={language} lineNumbers className="relative">
                <CodeBlockContent
                  language={language}
                  syntaxHighlighting={syntaxHighlighting}
                >
                  {content}
                </CodeBlockContent>
                {isStreaming && (
                  <span className="absolute bottom-4 right-4 inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
                )}
              </CodeBlockItem>
            )}
          </CodeBlockBody>
        </div>
      </CodeBlock>
    </div>
  );
}
