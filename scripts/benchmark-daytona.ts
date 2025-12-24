import { Daytona } from "@daytonaio/sdk";

const SNAPSHOT_NAME = "viber-workspace-template";
const WORKING_DIR = "/home/daytona/app";
const DEV_PORT = 3000;

async function benchmark() {
  const daytona = new Daytona();
  const times: Record<string, number> = {};

  console.log("🚀 Starting Daytona Benchmark\n");

  let start = Date.now();
  console.log("Testing cold start (creating sandbox from snapshot)...");
  const sandbox = await daytona.create({ snapshot: SNAPSHOT_NAME });
  times.coldStart = Date.now() - start;
  console.log(`  ✓ Cold start: ${times.coldStart}ms`);

  console.log("Testing preview URL...");
  start = Date.now();
  const preview = await sandbox.getPreviewLink(DEV_PORT);
  times.previewUrl = Date.now() - start;
  console.log(`  ✓ Preview URL: ${times.previewUrl}ms (${preview.url})`);

  console.log("Testing file write...");
  start = Date.now();
  await sandbox.fs.uploadFile(
    Buffer.from(
      'export const Test = () => <div className="text-red-500">Test</div>'
    ),
    `${WORKING_DIR}/src/test.tsx`
  );
  times.fileWrite = Date.now() - start;
  console.log(`  ✓ File write: ${times.fileWrite}ms`);

  console.log("Testing file read...");
  start = Date.now();
  const content = await sandbox.fs.downloadFile(`${WORKING_DIR}/src/test.tsx`);
  times.fileRead = Date.now() - start;
  console.log(`  ✓ File read: ${times.fileRead}ms (${content.length} bytes)`);

  console.log("Testing command execution...");
  start = Date.now();
  const cmdResult = await sandbox.process.executeCommand(
    "bun --version",
    WORKING_DIR
  );
  times.commandExec = Date.now() - start;
  console.log(
    `  ✓ Command exec: ${times.commandExec}ms (bun ${cmdResult.result?.trim()})`
  );

  console.log("Testing package install (lodash)...");
  start = Date.now();
  await sandbox.process.executeCommand("bun add lodash", WORKING_DIR);
  times.packageInstall = Date.now() - start;
  console.log(`  ✓ Package install: ${times.packageInstall}ms`);

  console.log("Testing list files...");
  start = Date.now();
  const files = await sandbox.fs.listFiles(WORKING_DIR);
  times.listFiles = Date.now() - start;
  console.log(`  ✓ List files: ${times.listFiles}ms (${files.length} items)`);

  console.log("\nCleaning up sandbox...");
  await sandbox.delete();

  console.log("\n📊 Benchmark Results (ms):");
  console.table(times);

  const total = Object.values(times).reduce((a, b) => a + b, 0);
  console.log(`\n⏱️  Total time: ${total}ms (${(total / 1000).toFixed(2)}s)`);

  console.log("\n🎯 Performance Targets:");
  console.log(
    `  Cold start: ${times.coldStart <= 10000 ? "✅" : "❌"} (target: <10s, actual: ${(times.coldStart / 1000).toFixed(2)}s)`
  );
  console.log(
    `  File write: ${times.fileWrite <= 500 ? "✅" : "❌"} (target: <500ms, actual: ${times.fileWrite}ms)`
  );
  console.log(
    `  File read: ${times.fileRead <= 500 ? "✅" : "❌"} (target: <500ms, actual: ${times.fileRead}ms)`
  );
  console.log(
    `  Command exec: ${times.commandExec <= 1000 ? "✅" : "❌"} (target: <1s, actual: ${times.commandExec}ms)`
  );
  console.log(
    `  Package install: ${times.packageInstall <= 5000 ? "✅" : "❌"} (target: <5s, actual: ${(times.packageInstall / 1000).toFixed(2)}s)`
  );
}

benchmark().catch((error) => {
  console.error("\n❌ Benchmark failed:", error);
  process.exit(1);
});
