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

function getWorkingOnMessage(friendlyName: string): string {
  const messages = [
    `Working on ${friendlyName} now`,
    `Moving on to ${friendlyName}`,
    `Now I'm tackling ${friendlyName}`,
    `Starting on ${friendlyName}`,
    `Getting ${friendlyName} set up`,
    `Building out ${friendlyName}`,
    `Putting together ${friendlyName}`,
    `Setting up ${friendlyName}`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getFinishedMessage(friendlyName: string): string {
  const messages = [
    `Just finished ${friendlyName}`,
    `Done with ${friendlyName}`,
    `Finished up ${friendlyName}`,
    `Completed ${friendlyName}`,
    `Wrapped up ${friendlyName}`,
    `Got ${friendlyName} done`,
    `${friendlyName} is ready`,
    `Finished putting together ${friendlyName}`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function BuilderLayout() {
  const sandbox = useSandbox();
  const generation = useGeneration();
  const voiceAgent = useVoiceAgentControls();
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(0);
  const [activePanel, setActivePanel] = useState<"preview" | "code">("preview");
  const prevSandboxReady = useRef(false);
  const prevGenerating = useRef(false);
  const prevApplying = useRef(false);
  const lastFileUpdateRef = useRef<string | null>(null);
  const completedFilesRef = useRef<Set<string>>(new Set());

  const handleNavigate = useCallback(
    (
      panel: "preview" | "code" | "files"
    ): { success: boolean; message: string } => {
      console.log("[BuilderLayout] Navigate to panel:", panel);

      if (panel === "preview") {
        setActivePanel("preview");
        return { success: true, message: "Switched to preview" };
      }

      if (panel === "code") {
        setActivePanel("code");
        return { success: true, message: "Switched to code view" };
      }

      return { success: true, message: `Navigated to ${panel}` };
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
      voiceAgent.sendSystemUpdate("Alright, let me build that for you");
      completedFilesRef.current.clear();
      lastFileUpdateRef.current = null;
    }

    // Send update when files complete (track via streamingFiles)
    // This provides granular, meaningful updates throughout generation
    generation.streamingFiles.forEach((file) => {
      if (!completedFilesRef.current.has(file.path)) {
        completedFilesRef.current.add(file.path);
        const friendlyName = getVoiceFriendlyFileName(file.path);
        voiceAgent.sendSystemUpdate(getFinishedMessage(friendlyName));
      }
    });

    // Also send update when a new file starts streaming (if it hasn't completed yet)
    // This helps during long generations where files take time to complete
    if (
      generation.currentFile &&
      generation.currentFile.path !== lastFileUpdateRef.current &&
      !completedFilesRef.current.has(generation.currentFile.path)
    ) {
      lastFileUpdateRef.current = generation.currentFile.path;
      const friendlyName = getVoiceFriendlyFileName(
        generation.currentFile.path
      );
      voiceAgent.sendSystemUpdate(getWorkingOnMessage(friendlyName));
    }

    if (
      !generation.isGenerating &&
      prevGenerating.current &&
      generation.files.length > 0
    ) {
      const fileWord = generation.files.length === 1 ? "file" : "files";
      voiceAgent.sendSystemUpdate(
        `Got it. Created ${generation.files.length} ${fileWord} for you`
      );
    }

    prevGenerating.current = generation.isGenerating;
  }, [
    generation.isGenerating,
    generation.currentFile,
    generation.streamingFiles,
    generation.files.length,
    voiceAgent,
  ]);

  useEffect(() => {
    if (generation.isApplying && !prevApplying.current) {
      voiceAgent.sendSystemUpdate("Just saving that to the project now");
    }

    if (
      !generation.isApplying &&
      prevApplying.current &&
      !generation.error &&
      generation.files.length > 0
    ) {
      toast.success("Code applied", {
        description: `${generation.files.length} file(s) updated`,
      });
      sandbox.refreshFiles();

      voiceAgent.sendSystemUpdate(
        "All set. Your app is loading in the preview now, should be ready in a few seconds"
      );

      // Start stabilization period to hide HMR transitions
      // Use shorter duration for small edits, longer for full generations
      const stabilizationDuration = generation.files.length <= 4 ? 8000 : 13000;
      setIsStabilizing(true);

      // Start preview refresh process 5 seconds before stabilization ends
      // This ensures the preview is ready when the loader disappears
      const previewRefreshDelay = Math.max(0, stabilizationDuration - 5000);

      setTimeout(async () => {
        // Ping the preview URL to ensure Vite is ready and trigger HMR
        if (sandbox.sandboxUrl) {
          try {
            await fetch(sandbox.sandboxUrl, {
              method: "HEAD",
              mode: "no-cors",
            });
            // Give it a moment for the bundle to be ready
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Trigger the preview refresh in the background
            setPreviewRefreshTrigger((prev) => prev + 1);
          } catch (error) {
            console.warn(
              "[BuilderLayout] Preview ping failed, refreshing anyway"
            );
            // Still refresh even if ping fails
            setPreviewRefreshTrigger((prev) => prev + 1);
          }
        } else {
          // No URL yet, just trigger refresh
          setPreviewRefreshTrigger((prev) => prev + 1);
        }
      }, previewRefreshDelay);

      // Hide loader after full stabilization period
      setTimeout(() => {
        setIsStabilizing(false);
      }, stabilizationDuration);

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
              voiceAgent.sendSystemUpdate("All done. Want to take a look?");
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
    if (generation.error && !prevGenerating.current && !prevApplying.current) {
      // Only send error update if we're not in the middle of generation/application
      voiceAgent.sendSystemUpdate(
        "Hmm, ran into a small issue. Want me to try again?"
      );
      toast.error("Generation failed", { description: generation.error });
    }
  }, [generation.error, voiceAgent, prevGenerating, prevApplying]);

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
        previewRefreshTrigger={previewRefreshTrigger}
        onRefresh={() => sandbox.refreshFiles()}
        isGenerating={generation.isGenerating}
        isStreaming={generation.isStreaming}
        currentFile={generation.currentFile}
        streamingFiles={generation.streamingFiles}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
      />
    </div>
  );
}
