import { useEffect } from "react";
import { useSandbox } from "@/lib/hooks/use-sandbox";
import { useGeneration } from "@/lib/hooks/use-generation";
import { BuilderSidebar } from "./builder-sidebar";
import { BuilderMain } from "./builder-main";

export function BuilderLayout() {
  const sandbox = useSandbox();
  const generation = useGeneration();

  useEffect(() => {
    if (!sandbox.isReady && !sandbox.isCreating && !sandbox.error) {
      sandbox.createSandbox();
    }
  }, [sandbox.isReady, sandbox.isCreating, sandbox.error]);

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
      onComplete: () => {
        sandbox.refreshFiles();
      },
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <BuilderSidebar
        onSendMessage={handleSendMessage}
        isGenerating={generation.isGenerating}
        isApplying={generation.isApplying}
        isSandboxCreating={sandbox.isCreating}
        progress={generation.progress}
        error={generation.error || sandbox.error}
        currentFile={generation.currentFile}
      />
      <BuilderMain
        sandboxUrl={sandbox.sandboxUrl}
        isLoading={sandbox.isCreating}
        files={sandbox.files}
        onRefresh={() => sandbox.refreshFiles()}
      />
    </div>
  );
}
