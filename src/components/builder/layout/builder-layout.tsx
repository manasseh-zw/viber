import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useSandbox } from "@/lib/hooks/use-sandbox";
import { useGeneration } from "@/lib/hooks/use-generation";
import { VoiceSidebar, useVoiceAgentControls } from "../voice";
import { BuilderMain } from "./builder-main";

export function BuilderLayout() {
  const sandbox = useSandbox();
  const generation = useGeneration();
  const voiceAgent = useVoiceAgentControls();
  const prevSandboxReady = useRef(false);
  const prevGenerating = useRef(false);
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
    if (generation.isGenerating && !prevGenerating.current) {
      voiceAgent.sendSystemUpdate("Starting code generation...");
    }

    if (generation.currentFile) {
      voiceAgent.sendSystemUpdate(`Generating ${generation.currentFile.path}`);
    }

    if (
      !generation.isGenerating &&
      prevGenerating.current &&
      generation.files.length > 0
    ) {
      voiceAgent.sendSystemUpdate(
        `Generation complete: ${generation.files.length} files created`
      );
    }

    prevGenerating.current = generation.isGenerating;
  }, [
    generation.isGenerating,
    generation.currentFile,
    generation.files.length,
    voiceAgent,
  ]);

  useEffect(() => {
    if (generation.isApplying && !prevApplying.current) {
      voiceAgent.sendSystemUpdate("Applying code to sandbox...");
    }

    if (!generation.isApplying && prevApplying.current && !generation.error) {
      voiceAgent.sendSystemUpdate(
        "Code applied successfully! Your app is ready to preview."
      );
      toast.success("Code applied", {
        description: `${generation.files.length} file(s) updated`,
      });
      sandbox.refreshFiles();
    }

    prevApplying.current = generation.isApplying;
  }, [
    generation.isApplying,
    generation.error,
    generation.files.length,
    voiceAgent,
    sandbox,
  ]);

  useEffect(() => {
    if (generation.error) {
      voiceAgent.sendSystemUpdate(`Error: ${generation.error}`);
      toast.error("Generation failed", { description: generation.error });
    }
  }, [generation.error, voiceAgent]);

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
  }, [generation.isGenerating, generation.files.length, sandbox.sandboxId]);

  const handleNavigate = useCallback(
    (panel: "preview" | "code" | "files", file?: string) => {
      console.log("[BuilderLayout] Navigate to:", panel, file);
    },
    []
  );

  const handleGenerate = useCallback(
    async (options: Parameters<typeof generation.generate>[0]) => {
      await generation.generate(options);
    },
    [generation]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <VoiceSidebar
        onNavigate={handleNavigate}
        onGenerate={handleGenerate}
        sandboxId={sandbox.sandboxId ?? undefined}
        isReady={sandbox.isReady}
        isGenerating={generation.isGenerating}
        isApplying={generation.isApplying}
      />
      <BuilderMain
        sandboxUrl={sandbox.sandboxUrl}
        isLoading={sandbox.isCreating}
        files={sandbox.files}
        onRefresh={() => sandbox.refreshFiles()}
        isGenerating={generation.isGenerating}
        isStreaming={generation.isStreaming}
        currentFile={generation.currentFile}
        streamingFiles={generation.streamingFiles}
      />
    </div>
  );
}
