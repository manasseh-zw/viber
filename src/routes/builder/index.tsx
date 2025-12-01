import { createFileRoute } from "@tanstack/react-router";
import { BuilderLayout } from "@/components/builder";

export const Route = createFileRoute("/builder/")({
  component: BuilderPage,
});

function BuilderPage() {
  return <BuilderLayout />;
}
