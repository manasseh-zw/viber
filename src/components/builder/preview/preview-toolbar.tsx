import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

interface PreviewToolbarProps {
  url: string | null;
  onRefresh: () => void;
}

export function PreviewToolbar({ url, onRefresh }: PreviewToolbarProps) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRefresh}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowClockwiseIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh preview</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleOpenExternal}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowSquareOutIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyUrl}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <CheckIcon className="size-4 text-green-500" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy URL"}</TooltipContent>
        </Tooltip>

        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
          {url}
        </span>
      </div>
    </TooltipProvider>
  );
}

