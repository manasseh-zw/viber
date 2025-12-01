import { createFileRoute } from "@tanstack/react-router";
import { createNewSandbox } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/sandbox/create")({
  server: {
    handlers: {
      POST: async () => {
        console.log("[api/sandbox/create] Creating new sandbox...");
        const result = await createNewSandbox();

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        console.log("[api/sandbox/create] Sandbox created:", result.sandboxId);
        return Response.json({
          success: true,
          sandboxId: result.sandboxId,
          url: result.url,
        });
      },
    },
  },
});
