import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSandbox } from "@/lib/hooks/use-sandbox";
import { useGeneration } from "@/lib/hooks/use-generation";
import { BuilderSidebar } from "./builder-sidebar";
import { BuilderMain } from "./builder-main";

export function BuilderLayout() {
  const sandbox = useSandbox();
  const generation = useGeneration();
  const prevSandboxReady = useRef(false);
  const prevApplying = useRef(false);

  useEffect(() => {
    if (!sandbox.isReady && !sandbox.isCreating && !sandbox.error) {
      sandbox.createSandbox();
    }
  }, [sandbox.isReady, sandbox.isCreating, sandbox.error]);

  useEffect(() => {
    if (sandbox.isReady && !prevSandboxReady.current) {
      toast.success("Workspace ready", {
        description: "Your development environment is set up",
      });
      sandbox.refreshFiles();
    }
    prevSandboxReady.current = sandbox.isReady;
  }, [sandbox.isReady, sandbox.refreshFiles]);

  useEffect(() => {
    if (sandbox.error) {
      toast.error("Sandbox error", {
        description: sandbox.error,
      });
    }
  }, [sandbox.error]);

  useEffect(() => {
    if (generation.error) {
      toast.error("Generation failed", {
        description: generation.error,
      });
    }
  }, [generation.error]);

  useEffect(() => {
    if (prevApplying.current && !generation.isApplying && !generation.error) {
      toast.success("Code applied", {
        description: `${generation.files.length} file(s) updated`,
      });
      sandbox.refreshFiles();
    }
    prevApplying.current = generation.isApplying;
  }, [generation.isApplying]);

  useEffect(() => {
    if (
      generation.files.length > 0 &&
      !generation.isGenerating &&
      !generation.isApplying &&
      sandbox.sandboxId
    ) {
      generation.apply(
        generation.files,
        generation.packages,
        sandbox.sandboxId
      );
    }
  }, [generation.isGenerating, generation.files.length]);

  const handleSendMessage = async (message: string) => {
    const isEdit = sandbox.isReady && Object.keys(sandbox.files).length > 0;
    await generation.generate({
      prompt: message,
      isEdit,
      sandboxId: sandbox.sandboxId ?? undefined,
    });
  };

  const handleCancelGeneration = () => {
    generation.cancel();
    toast.info("Generation cancelled");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <BuilderSidebar
        onSendMessage={handleSendMessage}
        onCancelGeneration={handleCancelGeneration}
        isGenerating={generation.isGenerating}
        isApplying={generation.isApplying}
        isSandboxCreating={sandbox.isCreating}
        progress={generation.progress}
        error={generation.error || sandbox.error}
        currentFile={generation.currentFile?.path ?? null}
        files={generation.files}
        packages={generation.packages}
      />
      <BuilderMain
        sandboxUrl={sandbox.sandboxUrl}
        isLoading={sandbox.isCreating}
        files={sandbox.files}
        onRefresh={() => sandbox.refreshFiles()}
        isStreaming={generation.isStreaming}
        currentFile={generation.currentFile}
        streamingFiles={generation.streamingFiles}
      />
    </div>
  );
}
