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
          contextFilesCount: context?.files ? Object.keys(context.files).length : 0,
          recentMessagesCount: context?.recentMessages?.length || 0,
        });

        let fileContext = context?.files;

        if (isEdit && sandboxId && !fileContext) {
          console.log("[api/generate/stream] Fetching files from sandbox", { sandboxId });
          try {
            const filesResult = await getSandboxFiles(sandboxId);
            if (filesResult.success && filesResult.files) {
              fileContext = filesResult.files;
              console.log("[api/generate/stream] Files fetched from sandbox", {
                fileCount: Object.keys(fileContext).length,
                files: Object.keys(fileContext),
              });
            } else {
              console.warn("[api/generate/stream] Failed to fetch sandbox files", {
                error: filesResult.error,
              });
            }
          } catch (error) {
            console.error("[api/generate/stream] Error fetching sandbox files", error);
          }
        }

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const send = (data: object) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
              );
            };

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
                eventCount++;
                if (eventCount % 5 === 0 || event.type === "file" || event.type === "complete" || event.type === "error") {
                  console.log("[api/generate/stream] Event emitted", {
                    eventCount,
                    type: event.type,
                    ...(event.type === "file" && "data" in event ? { filePath: event.data.path } : {}),
                    ...(event.type === "complete" && "data" in event ? { filesCount: event.data.files.length, packagesCount: event.data.packages.length } : {}),
                  });
                }
                send(event);
              }

              console.log("[api/generate/stream] Stream completed", {
                totalEvents: eventCount,
              });
            } catch (error) {
              console.error("[api/generate/stream] Stream error", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              });
              send({
                type: "error",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
