import type { DaytonaSandbox } from "./daytona.provider";
import { createSandbox } from "./factory";

interface ManagedSandbox {
  sandboxId: string;
  sandbox: DaytonaSandbox;
  createdAt: Date;
  lastAccessed: Date;
}

class SandboxManager {
  private sandboxes: Map<string, ManagedSandbox> = new Map();
  private activeSandboxId: string | null = null;

  async getOrCreate(sandboxId: string): Promise<DaytonaSandbox> {
    const existing = this.sandboxes.get(sandboxId);
    if (existing) {
      existing.lastAccessed = new Date();
      return existing.sandbox;
    }

    return createSandbox();
  }

  register(sandboxId: string, sandbox: DaytonaSandbox): void {
    this.sandboxes.set(sandboxId, {
      sandboxId,
      sandbox,
      createdAt: new Date(),
      lastAccessed: new Date(),
    });
    this.activeSandboxId = sandboxId;
  }

  getActive(): DaytonaSandbox | null {
    if (!this.activeSandboxId) {
      return null;
    }

    const managed = this.sandboxes.get(this.activeSandboxId);
    if (managed) {
      managed.lastAccessed = new Date();
      return managed.sandbox;
    }

    return null;
  }

  getActiveSandboxId(): string | null {
    return this.activeSandboxId;
  }

  get(sandboxId: string): DaytonaSandbox | null {
    const managed = this.sandboxes.get(sandboxId);
    if (managed) {
      managed.lastAccessed = new Date();
      return managed.sandbox;
    }
    return null;
  }

  setActive(sandboxId: string): boolean {
    if (this.sandboxes.has(sandboxId)) {
      this.activeSandboxId = sandboxId;
      return true;
    }
    return false;
  }

  async terminate(sandboxId: string): Promise<void> {
    const managed = this.sandboxes.get(sandboxId);
    if (managed) {
      try {
        await managed.sandbox.destroy();
      } catch (error) {
        console.error(`Error terminating sandbox ${sandboxId}:`, error);
      }
      this.sandboxes.delete(sandboxId);

      if (this.activeSandboxId === sandboxId) {
        this.activeSandboxId = null;
      }
    }
  }

  async terminateAll(): Promise<void> {
    const promises = Array.from(this.sandboxes.values()).map((managed) =>
      managed.sandbox.destroy().catch((err) => {
        console.error(`Error terminating sandbox ${managed.sandboxId}:`, err);
      })
    );

    await Promise.all(promises);
    this.sandboxes.clear();
    this.activeSandboxId = null;
  }

  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [id, info] of this.sandboxes.entries()) {
      const age = now.getTime() - info.lastAccessed.getTime();
      if (age > maxAge) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.terminate(id);
    }
  }

  count(): number {
    return this.sandboxes.size;
  }
}

export const sandboxManager = new SandboxManager();

declare global {
  // eslint-disable-next-line no-var
  var sandboxManager: SandboxManager;
}

global.sandboxManager = sandboxManager;
