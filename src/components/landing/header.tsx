import { GithubLogoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Container } from "../container";
import { Logo } from "../logo";
import { LandingButton } from "./landing-button";
import { Button } from "../ui/button";

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
            <a
              href="https://github.com/manasseh-zw/viber"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row gap-2 align-bottom "
              aria-label="GitHub Repository"
            >
              <Button variant="link" size="lg" className="text-black">
                <GithubLogoIcon className="size-5" />
                <span className="text-base font-medium">Github</span>
              </Button>
            </a>
          </div>
        </nav>
      </Container>
    </header>
  );
}
