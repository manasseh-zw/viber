import { cn } from "@/lib/utils";

interface GlowingBorderProps {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function GlowingBorder({
  active = false,
  children,
  className,
}: GlowingBorderProps) {
  return (
    <div
      className={cn("relative flex-1 flex flex-col overflow-hidden", className)}
    >
      {active && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 rounded-lg opacity-60">
              <div
                className="absolute inset-0 animate-glow-spin"
                style={{
                  background: `conic-gradient(
                    from var(--glow-angle, 0deg),
                    transparent 0%,
                    #FF5C06 10%,
                    #F57119 20%,
                    transparent 30%,
                    transparent 50%,
                    #F57119 60%,
                    #FF5C06 70%,
                    transparent 80%,
                    transparent 100%
                  )`,
                  filter: "blur(8px)",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "exclude",
                  WebkitMaskComposite: "xor",
                  padding: "3px",
                }}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10">
            <div
              className="absolute inset-0 rounded-lg animate-glow-pulse"
              style={{
                boxShadow: `
                  inset 0 0 20px rgba(255, 92, 6, 0.15),
                  inset 0 0 40px rgba(245, 113, 25, 0.1)
                `,
              }}
            />
          </div>
          <div className="pointer-events-none absolute -inset-px z-10 rounded-lg border border-[#FF5C06]/20" />
        </>
      )}
      <div className="relative z-0 flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
