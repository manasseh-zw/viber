import { createFileRoute } from "@tanstack/react-router";
import { killSandbox } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/sandbox/kill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sandboxId: string | undefined;

        try {
          const body = await request.json();
          sandboxId = body.sandboxId;
        } catch {
          // No body provided, will terminate all sandboxes
        }

        console.log("[api/sandbox/kill] Terminating sandbox:", sandboxId || "all");
        const result = await killSandbox(sandboxId);

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return Response.json({ success: true });
      },
    },
  },
});

