import type { StreamingFile } from "@/lib/hooks/use-generation";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { useEffect, useRef, useState } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";

interface StreamingCodeViewerProps {
  currentFile: StreamingFile | null;
  completedFiles: StreamingFile[];
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
    default:
      return "text";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function CurrentFileBlock({ file }: { file: StreamingFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isHighlighting, setIsHighlighting] = useState(false);
  const lineCount = file.content.split("\n").length;
  const prevContentRef = useRef<string>("");

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [file.content, highlightedCode]);

  useEffect(() => {
    if (!file.content) {
      setHighlightedCode("");
      return;
    }

    if (file.content === prevContentRef.current && highlightedCode) {
      return;
    }
    prevContentRef.current = file.content;

    if (file.content.length < 100) {
      setHighlightedCode(`<pre><code>${escapeHtml(file.content)}</code></pre>`);
      setIsHighlighting(false);
      return;
    }

    let cancelled = false;
    setIsHighlighting(true);

    const highlight = async () => {
      try {
        const lang = getLanguage(file.path);
        if (lang === "text") {
          if (!cancelled) {
            setHighlightedCode(
              `<pre><code>${escapeHtml(file.content)}</code></pre>`
            );
            setIsHighlighting(false);
          }
          return;
        }
        const html = await codeToHtml(file.content, {
          lang,
          theme: "github-dark-default",
        });
        if (!cancelled) {
          setHighlightedCode(html);
          setIsHighlighting(false);
        }
      } catch {
        if (!cancelled) {
          setHighlightedCode(
            `<pre><code>${escapeHtml(file.content)}</code></pre>`
          );
          setIsHighlighting(false);
        }
      }
    };

    const delay = 300;
    const timeout = setTimeout(highlight, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [file.content, file.path, highlightedCode]);

  return (
    <div className="rounded-lg overflow-hidden border-2 border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <CircleNotchIcon className="size-5 text-primary animate-spin" />
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
        className="bg-[#0d1117] overflow-auto max-h-[60vh] min-h-[200px]"
      >
        {isHighlighting && !highlightedCode ? (
          <div className="p-4">
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: Math.min(lineCount, 8) }).map((_, i) => (
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
            <span className="absolute bottom-4 right-4 inline-block w-2.5 h-6 bg-primary animate-pulse rounded-sm" />
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedFileBlock({ file }: { file: StreamingFile }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const lineCount = file.content.split("\n").length;

  useEffect(() => {
    if (!isExpanded || highlightedCode) return;

    let cancelled = false;
    const highlight = async () => {
      try {
        const lang = getLanguage(file.path);
        if (lang === "text") {
          if (!cancelled) {
            setHighlightedCode(
              `<pre><code>${escapeHtml(file.content)}</code></pre>`
            );
          }
          return;
        }
        const html = await codeToHtml(file.content, {
          lang,
          theme: "github-dark-default",
        });
        if (!cancelled) {
          setHighlightedCode(html);
        }
      } catch {
        if (!cancelled) {
          setHighlightedCode(
            `<pre><code>${escapeHtml(file.content)}</code></pre>`
          );
        }
      }
    };

    highlight();
    return () => {
      cancelled = true;
    };
  }, [isExpanded, file.content, file.path, highlightedCode]);

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-[#0d1117]/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-[#161b22] hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <CaretDownIcon className="size-4 text-muted-foreground" />
          ) : (
            <CaretRightIcon className="size-4 text-muted-foreground" />
          )}
          <CheckCircleIcon weight="fill" className="size-4 text-green-500" />
          <span className="text-xs font-mono text-gray-100 font-medium">
            {file.path}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </button>

      {isExpanded && (
        <div className="bg-[#0d1117] overflow-auto max-h-[300px] border-t border-border/30">
          {highlightedCode ? (
            <div
              className="code-viewer-content p-4 text-sm [&_pre]:bg-transparent! [&_pre]:m-0! [&_pre]:p-0! [&_code]:font-mono [&_.line]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          ) : (
            <div className="p-4">
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: Math.min(lineCount, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 bg-muted/20 rounded"
                    style={{ width: `${Math.random() * 60 + 20}%` }}
                  />
                ))}
              </div>
            </div>
          )}
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

  // Auto-scroll to bottom when content changes or new files are added
  useEffect(() => {
    if (containerRef.current && (currentFile || completedFiles.length > 0)) {
      // Use requestAnimationFrame to ensure DOM has updated
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
            <CircleNotchIcon className="size-10 animate-spin text-primary" />
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
      {/* Current file being generated - shown at the top, fully expanded */}
      {currentFile && (
        <CurrentFileBlock
          key={`current-${currentFile.path}`}
          file={currentFile}
        />
      )}

      {/* Completed files below - collapsed by default */}
      {completedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <CheckCircleIcon
              weight="fill"
              className="size-3.5 text-green-500"
            />
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
