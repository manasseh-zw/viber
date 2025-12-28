import { createFileRoute } from "@tanstack/react-router";
import { streamGenerateCode } from "../../../lib/ai/service";
import {
  getSandboxFileList,
  getSandboxFileContents,
} from "../../../lib/sandbox/service";
import { selectFilesForEdit } from "../../../lib/helpers/llm-intent-analyzer";
import type { GenerateCodeRequest } from "../../../lib/types/ai";

export const Route = createFileRoute("/api/generate/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: GenerateCodeRequest;

        try {
          body = await request.json();
        } catch {
          return Response.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 }
          );
        }

        const { prompt, isEdit, sandboxId, context } = body;

        if (!prompt) {
          return Response.json(
            { success: false, error: "Prompt is required" },
            { status: 400 }
          );
        }

        console.log("[api/generate/stream] Request received", {
          prompt: prompt.substring(0, 100) + "...",
          promptLength: prompt.length,
          isEdit,
          sandboxId,
          hasContext: !!context,
          contextFilesCount: context?.files
            ? Object.keys(context.files).length
            : 0,
          recentMessagesCount: context?.recentMessages?.length || 0,
        });

        let fileContext = context?.files;

        if (isEdit && sandboxId && !fileContext) {
          console.log("[api/generate/stream] Smart file selection for edit", {
            sandboxId,
          });

          try {
            const fileListResult = await getSandboxFileList(sandboxId);

            if (fileListResult.success && fileListResult.files) {
              console.log("[api/generate/stream] Got file list", {
                fileCount: fileListResult.files.length,
              });

              const intentResult = await selectFilesForEdit(
                prompt,
                fileListResult.files
              );

              console.log("[api/generate/stream] Intent analysis complete", {
                targetFiles: intentResult.targetFiles,
                editType: intentResult.editType,
                confidence: intentResult.confidence,
              });

              if (intentResult.targetFiles.length > 0) {
                const contentsResult = await getSandboxFileContents(
                  intentResult.targetFiles,
                  sandboxId
                );

                if (contentsResult.success && contentsResult.files) {
                  fileContext = contentsResult.files;
                  console.log(
                    "[api/generate/stream] Fetched targeted file contents",
                    {
                      fileCount: Object.keys(fileContext).length,
                      files: Object.keys(fileContext),
                    }
                  );
                }
              }

              if (!fileContext || Object.keys(fileContext).length === 0) {
                console.warn(
                  "[api/generate/stream] No files selected, fetching App.tsx as fallback"
                );
                const appFile = fileListResult.files.find(
                  (f) => f.endsWith("App.tsx") || f.endsWith("App.jsx")
                );
                if (appFile) {
                  const fallbackResult = await getSandboxFileContents(
                    [appFile],
                    sandboxId
                  );
                  if (fallbackResult.success && fallbackResult.files) {
                    fileContext = fallbackResult.files;
                  }
                }
              }
            } else {
              console.error(
                "[api/generate/stream] Failed to get file list",
                fileListResult.error
              );
            }
          } catch (error) {
            console.error(
              "[api/generate/stream] Error in smart file selection",
              {
                error: error instanceof Error ? error.message : String(error),
              }
            );
          }
        } else if (isEdit && !sandboxId) {
          console.warn(
            "[api/generate/stream] Edit requested but no sandboxId provided",
            { isEdit, sandboxId }
          );
        } else if (isEdit && fileContext) {
          console.log("[api/generate/stream] Edit with provided context", {
            fileCount: Object.keys(fileContext).length,
          });
        }

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        request.signal.addEventListener("abort", () => {
          console.log("[api/generate/stream] Client disconnected");
          abortController.abort();
        });

        const stream = new ReadableStream({
          async start(controller) {
            let isClosed = false;
            let lastSendTime = Date.now();
            let keepAliveInterval: NodeJS.Timeout | null = null;

            const send = (data: object) => {
              if (isClosed || abortController.signal.aborted) return;
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
                lastSendTime = Date.now();
              } catch {
                isClosed = true;
              }
            };

            // Send keep-alive heartbeats every 5 seconds to prevent timeouts
            keepAliveInterval = setInterval(() => {
              const timeSinceLastSend = Date.now() - lastSendTime;
              if (timeSinceLastSend > 4000 && !isClosed) {
                send({ type: "heartbeat", message: "Generating..." });
              }
            }, 5000);

            try {
              console.log("[api/generate/stream] Creating generator", {
                isEdit: isEdit ?? false,
                hasFileContext:
                  !!fileContext && Object.keys(fileContext).length > 0,
                fileContextKeys: fileContext ? Object.keys(fileContext) : [],
              });

              const generator = streamGenerateCode({
                prompt,
                isEdit: isEdit ?? false,
                fileContext: fileContext,
                recentMessages: context?.recentMessages,
              });

              let eventCount = 0;
              for await (const event of generator) {
                if (abortController.signal.aborted) {
                  console.log(
                    "[api/generate/stream] Aborting due to client disconnect"
                  );
                  break;
                }

                eventCount++;
                if (
                  eventCount % 5 === 0 ||
                  event.type === "file" ||
                  event.type === "complete" ||
                  event.type === "error"
                ) {
                  console.log("[api/generate/stream] Event emitted", {
                    eventCount,
                    type: event.type,
                    ...(event.type === "file" && "data" in event
                      ? { filePath: event.data.path }
                      : {}),
                    ...(event.type === "complete" && "data" in event
                      ? {
                          filesCount: event.data.files.length,
                          packagesCount: event.data.packages.length,
                        }
                      : {}),
                  });
                }
                send(event);
              }

              console.log("[api/generate/stream] Stream completed", {
                totalEvents: eventCount,
              });
            } catch (error) {
              if (!abortController.signal.aborted) {
                console.error("[api/generate/stream] Stream error", {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                });
                send({
                  type: "error",
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
            } finally {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
              }
              isClosed = true;
              try {
                controller.close();
              } catch {
                // Already closed
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // Disable Nginx buffering
          },
        });
      },
    },
  },
});
