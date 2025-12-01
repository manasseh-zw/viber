import { createFileRoute } from "@tanstack/react-router";
import { getSandboxFiles } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/sandbox/files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sandboxId = url.searchParams.get("sandboxId") || undefined;

        const result = await getSandboxFiles(sandboxId);

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error },
            { status: result.error === "No active sandbox" ? 404 : 500 }
          );
        }

        return Response.json({
          success: true,
          files: result.files,
        });
      },
    },
  },
});

