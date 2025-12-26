import { LayoutGroup, motion } from "motion/react";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import TextRotate from "@/components/fancy/text/text-rotate";
import { SandboxIframe } from "./sandbox-iframe";

interface PreviewPanelProps {
  sandboxUrl: string | null;
  isLoading: boolean;
  isApplying?: boolean;
  iframeKey?: number;
}

export function PreviewPanel({
  sandboxUrl,
  isLoading,
  isApplying,
  iframeKey = 0,
}: PreviewPanelProps) {
  if (isLoading || isApplying) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-foreground -mt-8">
        <LayoutGroup>
          <motion.p
            className="flex whitespace-pre text-lg sm:text-xl md:text-2xl font-medium "
            layout
          >
            <motion.span
              className="pt-0.5 sm:pt-1 font-light"
              layout
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            >
              {isLoading ? "Setting up " : "Applying "}
            </motion.span>
            <TextRotate
              texts={
                isLoading
                  ? [
                      "workspace",
                      "environment",
                      "sandbox",
                      "dependencies",
                      "runtime",
                    ]
                  : ["changes", "updates", "features", "components", "styles"]
              }
              mainClassName="text-white px-2 sm:px-3 bg-[#ff5941] overflow-hidden py-0.5 sm:py-1 justify-center rounded-lg"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </motion.p>
        </LayoutGroup>
        <p className="text-xs text-muted-foreground opacity-70">
          {isLoading
            ? "This may take a few seconds"
            : "Optimizing your preview environment"}
        </p>
      </div>
    );
  }

  if (!sandboxUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="p-4 rounded-full bg-muted/50">
          <EyeIcon className="size-10 opacity-50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Preview will appear here</p>
          <p className="text-xs opacity-70">
            Describe what you want to build to get started
          </p>
        </div>
      </div>
    );
  }

  return <SandboxIframe url={sandboxUrl} refreshKey={iframeKey} />;
}
