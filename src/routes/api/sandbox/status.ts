import { createFileRoute } from "@tanstack/react-router";
import { getSandboxStatus } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/sandbox/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sandboxId = url.searchParams.get("sandboxId") || undefined;

        const result = await getSandboxStatus(sandboxId);

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error },
            { status: result.error === "No active sandbox" ? 404 : 500 }
          );
        }

        return Response.json({
          success: true,
          isAlive: result.isAlive,
          sandboxId: result.sandboxId,
          url: result.url,
        });
      },
    },
  },
});

