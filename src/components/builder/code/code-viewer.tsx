import { useEffect, useState, useRef } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { cn } from "@/lib/utils";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";

interface CodeViewerProps {
  fileName: string | null;
  content: string | null;
  isStreaming?: boolean;
}

function getLanguage(fileName: string): BundledLanguage | "text" {
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
      return "text";
  }
}

export function CodeViewer({
  fileName,
  content,
  isStreaming = false,
}: CodeViewerProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef<string>("");

  useEffect(() => {
    if (!content || !fileName) {
      setHighlightedCode("");
      return;
    }

    if (content === prevContentRef.current && highlightedCode) {
      return;
    }
    prevContentRef.current = content;

    if (isStreaming && content.length < 5000) {
      setHighlightedCode(`<pre><code>${escapeHtml(content)}</code></pre>`);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const highlight = async () => {
      try {
        const lang = getLanguage(fileName);
        if (lang === "text") {
          if (!cancelled) {
            setHighlightedCode(
              `<pre><code>${escapeHtml(content)}</code></pre>`
            );
          }
          return;
        }
        const html = await codeToHtml(content, {
          lang,
          theme: "github-dark-default",
        });
        if (!cancelled) {
          setHighlightedCode(html);
        }
      } catch {
        if (!cancelled) {
          setHighlightedCode(`<pre><code>${escapeHtml(content)}</code></pre>`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const delay = isStreaming ? 500 : 0;
    const timeout = setTimeout(highlight, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [content, fileName, isStreaming]);

  useEffect(() => {
    if (isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!fileName || content === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a file to view its contents</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b border-border/50",
          isStreaming ? "bg-primary/10" : "bg-[#161b22]"
        )}
      >
        <div className="flex items-center gap-2">
          {isStreaming && (
            <CircleNotchIcon className="size-3.5 animate-spin text-primary" />
          )}
          <span className="text-xs font-mono text-foreground/90 truncate">
            {fileName}
          </span>
          {isStreaming && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium">
              Streaming
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all",
            copied
              ? "bg-green-500/20 text-green-400"
              : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div ref={codeRef} className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-muted/20 rounded"
                  style={{ width: `${Math.random() * 60 + 20}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              className="code-viewer-content p-4 text-sm [&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0! [&_code]:font-mono [&_.line]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
            {isStreaming && (
              <span className="absolute bottom-4 right-4 inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
