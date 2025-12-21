import { Link } from "@tanstack/react-router";
import { Container } from "../container";
import { LandingButton } from "./landing-button";

export function Hero() {
  return (
    <Container className="pb-16 pt-28 text-center">
      <h1 className="mx-auto max-w-4xl font-lora text-5xl font-light tracking-tight text-slate-900 sm:text-8xl animate-fade-up delay-300">
        <span className="font-architype text-primary  tracking-wide">
          vibecode<span className="animate-blink">_</span>
        </span>{" "}
        with
        <br />
        <span>your voice</span>
      </h1>
      <div className="mt-12 flex justify-center gap-x-4 animate-fade-in delay-500">
        <LandingButton className="rounded-none" size="xl" asChild>
          <Link to="/builder">Start Vibing</Link>
        </LandingButton>
      </div>
    </Container>
  );
}
