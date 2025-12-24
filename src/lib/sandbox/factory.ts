import { DaytonaSandbox } from "./daytona.provider";

export function createSandbox(apiKey?: string): DaytonaSandbox {
  return new DaytonaSandbox(apiKey);
}
