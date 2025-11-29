import { GithubLogoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Container } from "../container";
import { Logo } from "../logo";
import { LandingButton } from "./landing-button";

export function Header() {
  return (
    <header className="py-10 pb-6">
      <Container>
        <nav className="relative z-50 flex justify-between items-start">
          <div className="flex items-center md:gap-x-12 animate-fade-up delay-100">
            <Link
              to="/"
              className="flex flex-row gap-2 align-bottom"
              aria-label="Home"
            >
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-x-5 md:gap-x-8 animate-fade-up delay-200">
            <LandingButton className="rounded-xl" size="lg" variant="secondary">
              <GithubLogoIcon />
              Repo
            </LandingButton>
          </div>
        </nav>
      </Container>
    </header>
  );
}
