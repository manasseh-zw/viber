import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { useSandbox } from "@/lib/hooks/use-sandbox";
import { useGeneration } from "@/lib/hooks/use-generation";
import {
  VoiceSidebar,
  useVoiceAgentControls,
} from "@/components/builder/voice";
import { BuilderMain } from "@/components/builder/builder-main";

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

function getFinishedMessage(friendlyName: string, index: number): string {
  const messageGroups = [
    [
      `Just finished ${friendlyName}`,
      `Done with ${friendlyName}`,
      `${friendlyName} is ready`,
    ],
    [
      `Moving along, got ${friendlyName} done`,
      `Making progress, finished ${friendlyName}`,
      `${friendlyName} is complete`,
    ],
    [
      `Still going, wrapped up ${friendlyName}`,
      `Knocked out ${friendlyName}`,
      `${friendlyName} is good to go`,
    ],
    [
      `Almost there, just did ${friendlyName}`,
      `${friendlyName} is done now`,
      `Finished up ${friendlyName}`,
    ],
  ];
  const group = messageGroups[Math.min(index, messageGroups.length - 1)];
  return group[Math.floor(Math.random() * group.length)];
}

export const Route = createFileRoute("/builder/")({
  component: BuilderPage,
});

function BuilderPage() {
  const sandbox = useSandbox();
  const generation = useGeneration();
  const voiceAgent = useVoiceAgentControls();
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(0);
  const [activePanel, setActivePanel] = useState<"preview" | "code">("preview");
  const prevSandboxReady = useRef(false);
  const prevGenerating = useRef(false);
  const prevApplying = useRef(false);
  const announcedFilesRef = useRef<Set<string>>(new Set());
  const announcedCountRef = useRef(0);

  const handleNavigate = useCallback(
    (
      panel: "preview" | "code" | "files"
    ): { success: boolean; message: string } => {
      console.log("[BuilderPage] Navigate to panel:", panel);

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
      announcedFilesRef.current.clear();
      announcedCountRef.current = 0;
    }

    const MAX_ANNOUNCEMENTS = 4;
    const totalCompleted = generation.streamingFiles.length;

    if (
      generation.isGenerating &&
      totalCompleted > 0 &&
      announcedCountRef.current < MAX_ANNOUNCEMENTS
    ) {
      const shouldAnnounce =
        (announcedCountRef.current === 0 && totalCompleted >= 1) ||
        (announcedCountRef.current === 1 && totalCompleted >= 3) ||
        (announcedCountRef.current === 2 && totalCompleted >= 5) ||
        (announcedCountRef.current === 3 && totalCompleted >= 7);

      if (shouldAnnounce) {
        const latestFile = generation.streamingFiles[totalCompleted - 1];
        if (!announcedFilesRef.current.has(latestFile.path)) {
          const currentIndex = announcedCountRef.current;
          announcedFilesRef.current.add(latestFile.path);
          announcedCountRef.current++;
          const friendlyName = getVoiceFriendlyFileName(latestFile.path);
          voiceAgent.sendSystemUpdate(
            getFinishedMessage(friendlyName, currentIndex)
          );
        }
      }
    }

    if (
      !generation.isGenerating &&
      prevGenerating.current &&
      generation.files.length > 0
    ) {
      const totalFiles = generation.files.length;
      const fileWord = totalFiles === 1 ? "file" : "files";
      voiceAgent.sendSystemUpdate(
        `All done. Created ${totalFiles} ${fileWord} for you`
      );
    }

    prevGenerating.current = generation.isGenerating;
  }, [
    generation.isGenerating,
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

      const stabilizationDuration = generation.files.length <= 4 ? 8000 : 13000;
      setIsStabilizing(true);

      const previewRefreshDelay = Math.max(0, stabilizationDuration - 5000);

      setTimeout(async () => {
        if (sandbox.sandboxUrl) {
          try {
            await fetch(sandbox.sandboxUrl, {
              method: "HEAD",
              mode: "no-cors",
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));

            setPreviewRefreshTrigger((prev) => prev + 1);
          } catch (error) {
            console.warn(
              "[BuilderPage] Preview ping failed, refreshing anyway"
            );
            setPreviewRefreshTrigger((prev) => prev + 1);
          }
        } else {
          setPreviewRefreshTrigger((prev) => prev + 1);
        }
      }, previewRefreshDelay);

      setTimeout(() => {
        setIsStabilizing(false);
      }, stabilizationDuration);

      if (sandbox.sandboxId) {
        const sandboxId = sandbox.sandboxId;
        setTimeout(() => {
          generation.checkDiagnostics(sandboxId).then((result) => {
            if (!result.success && result.output) {
              console.warn(
                "[BuilderPage] Diagnostics found issues:",
                result.output
              );
              toast.warning("Potential issues detected", {
                description:
                  "Check the console for details or ask me to fix them.",
              });
            } else {
              voiceAgent.sendSystemUpdate("All done. Want to take a look?");
            }
          });
        }, 5000);
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
