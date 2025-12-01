import { createFileRoute } from "@tanstack/react-router";
import {
  applyFilesToSandbox,
  installPackages,
} from "../../../lib/sandbox/service";
import type { ApplyCodeRequest } from "../../../lib/types/ai";

export const Route = createFileRoute("/api/apply/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ApplyCodeRequest;

        try {
          body = await request.json();
        } catch {
          return Response.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 }
          );
        }

        const { sandboxId, files, packages } = body;

        if (!files || files.length === 0) {
          return Response.json(
            { success: false, error: "Files are required" },
            { status: 400 }
          );
        }

        console.log("[api/apply/stream] Applying code:", {
          sandboxId,
          fileCount: files.length,
          packageCount: packages?.length ?? 0,
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
              send({ type: "status", message: "Installing packages..." });

              if (packages && packages.length > 0) {
                send({
                  type: "status",
                  message: `Installing ${packages.length} package(s)...`,
                });

                const pkgResult = await installPackages(packages, sandboxId);

                if (!pkgResult.success) {
                  send({
                    type: "error",
                    message: `Failed to install packages: ${pkgResult.error}`,
                  });
                } else {
                  for (const pkg of packages) {
                    send({ type: "package", data: { name: pkg } });
                  }
                }
              }

              send({
                type: "status",
                message: `Applying ${files.length} file(s)...`,
              });

              const applyResult = await applyFilesToSandbox(
                files.map((f) => ({ path: f.path, content: f.content })),
                sandboxId
              );

              if (!applyResult.success) {
                send({
                  type: "error",
                  message: `Failed to apply files: ${applyResult.error}`,
                });
              } else {
                for (const filePath of applyResult.appliedFiles) {
                  send({
                    type: "file",
                    data: {
                      path: filePath,
                      status: "applied",
                    },
                  });
                }
              }

              send({
                type: "complete",
                data: {
                  appliedFiles: applyResult.appliedFiles,
                  installedPackages: packages ?? [],
                  success: applyResult.success,
                },
              });
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

