import { Logo } from "@/components/logo";
import { HandHeartIcon, HeartIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main>
      <HeartIcon />
      <HandHeartIcon />

      <Logo />  
    </main>
  );
}
