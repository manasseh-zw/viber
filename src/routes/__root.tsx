import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import "../styles.css";

const criticalCss = `
  :root {
    --background: oklch(0.9383 0.0042 236.4993);
    --primary: oklch(0.6397 0.172 36.4421);
  }
  .dark {
    --background: oklch(0.2598 0.0306 262.6666);
  }
  body {
    margin: 0;
    background: var(--background);
  }
  .page-loader {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    animation: fade-out 0.4s ease-out 0.5s forwards;
  }
  .page-loader svg {
    width: 4rem;
    height: 5rem;
    fill: var(--primary);
  }
  @keyframes fade-out {
    to { opacity: 0; visibility: hidden; }
  }
  .animate-fade-up {
    opacity: 0;
    animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-fade-in {
    opacity: 0;
    animation: fade-in 0.5s ease-out forwards;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }
  .delay-300 { animation-delay: 300ms; }
  .delay-400 { animation-delay: 400ms; }
  .delay-500 { animation-delay: 500ms; }
  .delay-600 { animation-delay: 600ms; }
  .delay-700 { animation-delay: 700ms; }
  .delay-800 { animation-delay: 800ms; }
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Viber",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Viber",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon-96x96.png",
        sizes: "96x96",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/site.webmanifest",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
