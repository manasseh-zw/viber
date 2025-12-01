import { createFileRoute } from "@tanstack/react-router";
import { streamGenerateCode } from "../../../lib/ai/service";
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

        const { prompt, isEdit, context } = body;

        if (!prompt) {
          return Response.json(
            { success: false, error: "Prompt is required" },
            { status: 400 }
          );
        }

        console.log("[api/generate/stream] Starting generation:", {
          prompt: prompt.substring(0, 100) + "...",
          isEdit,
        });

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const send = (data: object) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
              );
            };

            try {
              const generator = streamGenerateCode({
                prompt,
                isEdit: isEdit ?? false,
                fileContext: context?.files,
                recentMessages: context?.recentMessages,
              });

              for await (const event of generator) {
                send(event);
              }
            } catch (error) {
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
