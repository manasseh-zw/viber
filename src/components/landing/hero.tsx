import { Link } from "@tanstack/react-router";
import Typewriter from "typewriter-effect";
import { Container } from "../container";
import { LandingButton } from "./landing-button";

export function Hero() {
  return (
    <Container className="pb-16 pt-12 text-center lg:pt-24">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-8xl animate-fade-up delay-300">
        <span className="font-geist-mono text-primary">
          vibecode<span className="animate-blink">_</span>
        </span>{" "}
        with
        <br />
        <span>your Voice</span>
      </h1>
      <div className="mx-auto mt-8 max-w-2xl text-md tracking-wide text-slate-700 font-architype h-14">
        <Typewriter
          options={{
            delay: 25,
            cursor: "_",
          }}
          onInit={(typewriter) => {
            typewriter
              .typeString(
                '"I have no technical ability. I know nothing about code. All I know is what I like and what I don\'t like."'
              )
              .start();
          }}
        />
      </div>
      <div className="mt-4 flex justify-center gap-x-4 animate-fade-in delay-500">
        <LandingButton className="rounded-xl" size="xl" asChild>
          <Link to="/builder">Start Vibing</Link>
        </LandingButton>
      </div>
    </Container>
  );
}
