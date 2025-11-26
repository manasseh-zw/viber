import { Link } from "@tanstack/react-router";
import { Container } from "../container";
import { LandingButton } from "./landing-button";

export function Hero() {
  return (
    <Container className="pb-16 pt-14 text-center lg:pt-28">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-8xl">
        <span className="font-geist-mono text-primary">
          vibecode<span className="animate-blink">_</span>
        </span>{" "}
        with
        <br />
        <span>your Voice</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-md tracking-wide text-slate-700 font-architype">
        Build with your voice, never touch your keyboard. become a 10x vibecoder
      </p>
      <div className="mt-10 flex justify-center gap-x-4">
        <LandingButton className="rounded-xl" size="xl" asChild>
          <Link to="/">Start Vibing</Link>
        </LandingButton>
      </div>
    </Container>
  );
}
