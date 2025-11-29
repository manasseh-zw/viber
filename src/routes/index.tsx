import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: true,
  component: App,
});

function App() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <Hero />
      <img
        src="/rick-rubin.png"
        alt="Rick Rubin vibecoding"
        className="fixed left-0 z-0 pointer-events-none select-none"
        style={{
          maxHeight: "60vh",
          width: "auto",
          bottom: "-1%",
          maskImage: "linear-gradient(to right, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 90%, transparent 100%)",
        }}
      />
    </main>
  );
}
