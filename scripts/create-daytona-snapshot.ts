import { Daytona, Image } from "@daytonaio/sdk";

const SNAPSHOT_NAME = "viber-workspace-template";
const WORKING_DIR = "/home/daytona/app";

async function createSnapshot() {
  const daytona = new Daytona();

  console.log(`🚀 Creating snapshot: ${SNAPSHOT_NAME}\n`);
  console.log("Configuration:");
  console.log(`  Base image: oven/bun:latest`);
  console.log(`  Working directory: ${WORKING_DIR}`);
  console.log(`  Project type: React + Tailwind (via bun init)\n`);

  const templateImage = Image.base("oven/bun:latest")
    .runCommands("apt-get update && apt-get install -y git")
    .runCommands(`mkdir -p ${WORKING_DIR}`)
    .workdir(WORKING_DIR)
    .runCommands("bun init --react=tailwind -y")
    .runCommands("bun add lucide-react")
    .runCommands("bun add clsx tailwind-merge");

  console.log("Building snapshot (this may take a few minutes)...\n");

  await daytona.snapshot.create(
    { name: SNAPSHOT_NAME, image: templateImage },
    { onLogs: (log) => process.stdout.write(log) }
  );

  console.log(`\n✅ Snapshot "${SNAPSHOT_NAME}" created successfully!`);
  console.log("\nPre-installed packages:");
  console.log("  - react, react-dom");
  console.log("  - tailwindcss, bun-plugin-tailwind");
  console.log("  - lucide-react (icons)");
  console.log("  - clsx, tailwind-merge (utilities)");
  console.log("\nNext steps:");
  console.log("  1. Verify the snapshot in your Daytona dashboard");
  console.log(
    "  2. Run the benchmark script: bun run scripts/benchmark-daytona.ts"
  );
}

createSnapshot().catch((error) => {
  console.error("\n❌ Failed to create snapshot:", error);
  process.exit(1);
});
