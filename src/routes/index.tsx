import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { LogoIcon } from "@/components/logo";
import { ElevenLabsLogo, GeminiLogo } from "@/components/brand";
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
        <div className="fixed bottom-6 right-6 z-10 flex flex-col items-end gap-1 animate-fade-in delay-700 pointer-events-none">
          <div className="text-xs text-slate-500 font-architype tracking-wide">
            Powered by
          </div>
          <div className="flex items-end gap-4 ">
            <ElevenLabsLogo className="h-4 w-auto " />
            <GeminiLogo className=" h-6 w-auto" />
          </div>
        </div>
      </main>
    </>
  );
}
