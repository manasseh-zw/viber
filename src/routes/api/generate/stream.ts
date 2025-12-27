import { createFileRoute } from "@tanstack/react-router";
import { streamGenerateCode } from "../../../lib/ai/service";
import { getSandboxFiles } from "../../../lib/sandbox/service";
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
          console.log("[api/generate/stream] Fetching files from sandbox", {
            sandboxId,
          });
          try {
            const filesResult = await getSandboxFiles(sandboxId);
            if (filesResult.success && filesResult.files) {
              fileContext = filesResult.files;
              console.log("[api/generate/stream] Files fetched from sandbox", {
                fileCount: Object.keys(fileContext).length,
                files: Object.keys(fileContext),
              });
            } else {
              console.warn(
                "[api/generate/stream] Failed to fetch sandbox files",
                {
                  error: filesResult.error,
                }
              );
            }
          } catch (error) {
            console.error(
              "[api/generate/stream] Error fetching sandbox files",
              error
            );
          }
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
                hasFileContext: !!context?.files,
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
