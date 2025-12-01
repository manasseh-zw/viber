import type { SandboxProviderConfig } from "./types";
import { SandboxProvider } from "./types";
import { E2BProvider } from "./e2b.provider";

export class SandboxFactory {
  static create(config?: SandboxProviderConfig): SandboxProvider {
    return new E2BProvider(config || {});
  }

  static getAvailableProviders(): string[] {
    return ["e2b"];
  }

  static isProviderAvailable(): boolean {
    return !!process.env.E2B_API_KEY;
  }
}

