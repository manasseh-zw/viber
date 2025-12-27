import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { useSandbox } from "@/lib/hooks/use-sandbox";
import { useGeneration } from "@/lib/hooks/use-generation";
import { VoiceSidebar, useVoiceAgentControls } from "../voice";
import { BuilderMain } from "./builder-main";

function getVoiceFriendlyFileName(path: string): string {
  const fileName = path.split("/").pop() || path;
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");

  const words = nameWithoutExt
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();

  if (path.includes("components/")) return `the ${words} component`;
  if (path.includes("pages/") || path.includes("routes/"))
    return `the ${words} page`;
  if (path.includes("styles") || path.endsWith(".css"))
    return `the ${words} styles`;
  if (path.endsWith(".json")) return `the ${words} config`;
  if (path.includes("hooks/")) return `the ${words} hook`;
  if (path.includes("utils/") || path.includes("lib/"))
    return `the ${words} utility`;

  return `the ${words} file`;
}

export function BuilderLayout() {
  const sandbox = useSandbox();
  const generation = useGeneration();
  const voiceAgent = useVoiceAgentControls();
  const [isStabilizing, setIsStabilizing] = useState(false);
  const prevSandboxReady = useRef(false);
  const prevGenerating = useRef(false);
  const prevApplying = useRef(false);
  const lastFileUpdateRef = useRef<string | null>(null);
  const fileCountRef = useRef(0);

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

      // Wait a moment, play success sound, then start voice session
      setTimeout(() => {
        const successAudio = new Audio("/success.mp3");
        successAudio.volume = 0.4;
        successAudio.play().catch(() => {});

        voiceAgent.startSession().catch((err) => {
          console.warn("Failed to auto-start voice session:", err);
        });
      }, 800);
    }
    prevSandboxReady.current = sandbox.isReady;
  }, [sandbox.isReady, sandbox.refreshFiles, voiceAgent]);

  useEffect(() => {
    if (sandbox.error) {
      toast.error("Sandbox error", {
        description: sandbox.error,
      });
    }
  }, [sandbox.error]);

  useEffect(() => {
    if (generation.isGenerating && !prevGenerating.current) {
      voiceAgent.sendSystemUpdate("Started building your app");
      lastFileUpdateRef.current = null;
      fileCountRef.current = 0;
    }

    if (
      generation.currentFile &&
      generation.currentFile.path !== lastFileUpdateRef.current
    ) {
      lastFileUpdateRef.current = generation.currentFile.path;
      fileCountRef.current++;

      if (fileCountRef.current <= 3) {
        const friendlyName = getVoiceFriendlyFileName(
          generation.currentFile.path
        );
        voiceAgent.sendSystemUpdate(`Working on ${friendlyName}`);
      } else if (fileCountRef.current === 4) {
        voiceAgent.sendSystemUpdate("Creating additional files");
      }
    }

    if (
      !generation.isGenerating &&
      prevGenerating.current &&
      generation.files.length > 0
    ) {
      const fileWord = generation.files.length === 1 ? "file" : "files";
      voiceAgent.sendSystemUpdate(
        `Done generating. Created ${generation.files.length} ${fileWord}`
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
      voiceAgent.sendSystemUpdate("Saving your code to the project");
    }

    if (!generation.isApplying && prevApplying.current && !generation.error) {
      toast.success("Code applied", {
        description: `${generation.files.length} file(s) updated`,
      });
      sandbox.refreshFiles();

      voiceAgent.sendSystemUpdate(
        "Finished generating and applying your code. Your app should appear in the preview in a few seconds"
      );

      // Start stabilization period to hide HMR transitions
      // Use shorter duration for small edits, longer for full generations
      const stabilizationDuration = generation.files.length <= 2 ? 8000 : 20000;
      setIsStabilizing(true);
      setTimeout(() => setIsStabilizing(false), stabilizationDuration);

      // Run diagnostics after application with a delay to let files settle
      if (sandbox.sandboxId) {
        const sandboxId = sandbox.sandboxId;
        setTimeout(() => {
          generation.checkDiagnostics(sandboxId).then((result) => {
            if (!result.success && result.output) {
              console.warn(
                "[BuilderLayout] Diagnostics found issues:",
                result.output
              );
              toast.warning("Potential issues detected", {
                description:
                  "Check the console for details or ask me to fix them.",
              });
              // We no longer auto-fix to prevent cyclic generations and token burn
            } else {
              voiceAgent.sendSystemUpdate(
                "All done! Your app is ready to preview"
              );
            }
          });
        }, 5000); // 5 second delay
      }
    }

    prevApplying.current = generation.isApplying;
  }, [
    generation.isApplying,
    generation.error,
    generation.files.length,
    voiceAgent,
    sandbox,
    handleGenerate,
  ]);

  useEffect(() => {
    if (generation.error) {
      voiceAgent.sendSystemUpdate(
        "Something went wrong. Let me know if you'd like me to try again"
      );
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
        isApplying={generation.isApplying || isStabilizing}
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
