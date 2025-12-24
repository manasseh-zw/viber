import type { SandboxProviderConfig } from "./types";
import { SandboxProvider } from "./types";
import { E2BProvider } from "./e2b.provider";
import { DaytonaProvider } from "./daytona.provider";
import { appEnv } from "../env/env.server";

export type SandboxProviderType = "e2b" | "daytona";

export class SandboxFactory {
  static create(
    config?: SandboxProviderConfig,
    providerType?: SandboxProviderType
  ): SandboxProvider {
    const type = providerType || appEnv.SANDBOX_PROVIDER || "daytona";

    switch (type) {
      case "daytona":
        return new DaytonaProvider(config || {});
      case "e2b":
        return new E2BProvider(config || {});
      default:
        return new DaytonaProvider(config || {});
    }
  }

  static getAvailableProviders(): SandboxProviderType[] {
    const providers: SandboxProviderType[] = [];

    if (appEnv.DAYTONA_API_KEY) providers.push("daytona");
    if (appEnv.E2B_API_KEY) providers.push("e2b");

    return providers;
  }

  static isProviderAvailable(type?: SandboxProviderType): boolean {
    if (!type) {
      return !!appEnv.DAYTONA_API_KEY || !!appEnv.E2B_API_KEY;
    }

    switch (type) {
      case "daytona":
        return !!appEnv.DAYTONA_API_KEY;
      case "e2b":
        return !!appEnv.E2B_API_KEY;
      default:
        return false;
    }
  }
}
