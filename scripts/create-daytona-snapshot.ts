import { Daytona, Image } from "@daytonaio/sdk";

const SNAPSHOT_NAME = "viber-workspace-template";
const WORKING_DIR = "/home/daytona/app";

// Base64 encode the config files to avoid shell escaping issues
const packageJsonB64 = Buffer.from(
  JSON.stringify(
    {
      name: "sandbox-app",
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "bunx --bun vite --host --port 3000",
      },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "lucide-react": "^0.460.0",
        clsx: "^2.1.1",
        "tailwind-merge": "^2.5.0",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.0",
        vite: "^6.0.0",
        tailwindcss: "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
      },
    },
    null,
    2
  )
).toString("base64");

const tsconfigB64 = Buffer.from(
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
      },
      include: ["src"],
    },
    null,
    2
  )
).toString("base64");

const viteConfigB64 = Buffer.from(
  `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: true,
  }
})`
).toString("base64");

async function createSnapshot() {
  const daytona = new Daytona();

  console.log(`🚀 Creating snapshot: ${SNAPSHOT_NAME}\n`);
  console.log("Configuration:");
  console.log(`  Base image: oven/bun:latest`);
  console.log(`  Working directory: ${WORKING_DIR}`);
  console.log(`  Project type: React + Vite + Tailwind (Bun runtime)\n`);

  const templateImage = Image.base("oven/bun:latest")
    .runCommands("apt-get update && apt-get install -y git")
    .runCommands(`mkdir -p ${WORKING_DIR}/src`)
    .workdir(WORKING_DIR)
    .runCommands(`echo '${packageJsonB64}' | base64 -d > package.json`)
    .runCommands(`echo '${tsconfigB64}' | base64 -d > tsconfig.json`)
    .runCommands(`echo '${viteConfigB64}' | base64 -d > vite.config.ts`)
    .runCommands("bun install");

  console.log("Building snapshot (this may take a few minutes)...\n");

  await daytona.snapshot.create(
    { name: SNAPSHOT_NAME, image: templateImage },
    { onLogs: (log) => process.stdout.write(log) }
  );

  console.log(`\n✅ Snapshot "${SNAPSHOT_NAME}" created successfully!`);
  console.log("\nPre-installed packages:");
  console.log("  - react, react-dom");
  console.log("  - vite, @vitejs/plugin-react");
  console.log("  - tailwindcss, @tailwindcss/vite");
  console.log("  - lucide-react (icons)");
  console.log("  - clsx, tailwind-merge (utilities)");
  console.log("\nNext steps:");
  console.log("  1. Verify the snapshot in your Daytona dashboard");
  console.log("  2. Restart your dev server: bun run dev");
}

createSnapshot().catch((error) => {
  console.error("\n❌ Failed to create snapshot:", error);
  process.exit(1);
});
