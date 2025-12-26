import { createFileRoute } from "@tanstack/react-router";
import { runSandboxDiagnostics } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/sandbox/diagnostics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { sandboxId?: string };
        try {
          body = await request.json();
        } catch {
          body = {};
        }

        const { sandboxId } = body;
        const result = await runSandboxDiagnostics(sandboxId);

        return Response.json(result);
      },
    },
  },
});

