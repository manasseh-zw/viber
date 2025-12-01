import { createFileRoute } from "@tanstack/react-router";
import { installPackages } from "../../../lib/sandbox/service";

export const Route = createFileRoute("/api/packages/install")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { packages: string[]; sandboxId?: string };

        try {
          body = await request.json();
        } catch {
          return Response.json(
            { success: false, error: "Invalid JSON body" },
            { status: 400 }
          );
        }

        const { packages, sandboxId } = body;

        if (!packages || packages.length === 0) {
          return Response.json(
            { success: false, error: "Packages array is required" },
            { status: 400 }
          );
        }

        console.log("[api/packages/install] Installing packages:", packages);
        const result = await installPackages(packages, sandboxId);

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          installedPackages: packages,
        });
      },
    },
  },
});

