import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { LogoIcon } from "@/components/logo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: true,
  component: App,
});

function App() {
  return (
    <>
      <div className="page-loader">
        <LogoIcon className="w-16 h-20 text-primary" />
      </div>
      <main className="relative min-h-screen">
        <Header />
        <Hero />
        <img
          src="/rick-rubin-min.png"
          alt="Rick Rubin vibecoding"
          className="fixed left-0 z-0 pointer-events-none select-none animate-fade-in delay-800"
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
    </>
  );
}
