import { Daytona } from "@daytonaio/sdk";

// Use your custom domain (wildcard subdomains don't work on *.ondigitalocean.app)
const PROXY_BASE = "preview.viber.lol";
const DEV_PORT = 3000;

async function testProxy() {
  console.log("🧪 Testing Daytona Preview Proxy\n");
  console.log(`Proxy URL: https://${PROXY_BASE}\n`);

  // Step 1: Test if proxy base domain resolves
  console.log("1️⃣  Testing DNS resolution...");
  try {
    // Test a simple subdomain to verify wildcard DNS is working
    const testUrl = `https://test.${PROXY_BASE}`;
    console.log(`   Testing: ${testUrl}`);
    const response = await fetch(testUrl, {
      signal: AbortSignal.timeout(5000),
    }).catch((e) => e);

    if (response instanceof Error) {
      if (
        response.message.includes("ENOTFOUND") ||
        response.message.includes("getaddrinfo")
      ) {
        console.log(
          `   ❌ DNS not resolving - wildcard CNAME not configured yet`
        );
        console.log(
          `\n   Configure DNS: CNAME *.preview → viber-proxy-97v38.ondigitalocean.app`
        );
        return;
      }
      console.log(`   ⚠️  Connection issue (may be normal):`, response.message);
    } else {
      console.log(`   ✅ DNS resolving - got response ${response.status}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Test inconclusive:`, error);
  }

  // Step 2: Create a test sandbox
  console.log("\n2️⃣  Creating test sandbox...");
  const daytona = new Daytona();

  let sandbox;
  try {
    sandbox = await daytona.create({
      snapshot: "viber-workspace-template",
      public: true,
    });
    console.log(`   ✅ Sandbox created: ${sandbox.id}`);
  } catch (error) {
    console.log(`   ❌ Failed to create sandbox:`, error);
    return;
  }

  // Step 3: Build proxy URL
  const proxyUrl = `https://${DEV_PORT}-${sandbox.id}.${PROXY_BASE}`;
  console.log(`\n3️⃣  Proxy URL for sandbox:`);
  console.log(`   ${proxyUrl}`);

  // Step 4: Test the proxy URL
  console.log(
    "\n4️⃣  Testing proxy URL (may take a moment for sandbox to start)..."
  );

  // Wait a bit for the sandbox to initialize
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const proxyResponse = await fetch(proxyUrl, {
      headers: {
        "User-Agent": "Daytona-Proxy-Test/1.0",
      },
    });

    console.log(`   Status: ${proxyResponse.status}`);
    console.log(
      `   Content-Type: ${proxyResponse.headers.get("content-type")}`
    );

    const body = await proxyResponse.text();

    // Check if we got the warning page or actual content
    if (
      body.includes("Warning") ||
      (body.includes("daytona") && body.includes("security"))
    ) {
      console.log(
        `   ⚠️  Still seeing warning page - proxy may not be adding header`
      );
    } else if (body.includes("<!DOCTYPE html>") || body.includes("<html")) {
      console.log(`   ✅ Got HTML content - proxy is working!`);
      console.log(`   Preview: ${body.substring(0, 200)}...`);
    } else {
      console.log(`   Response preview: ${body.substring(0, 300)}`);
    }
  } catch (error) {
    console.log(`   ❌ Proxy request failed:`, error);
  }

  // Step 5: Compare with direct Daytona URL
  console.log("\n5️⃣  Comparing with direct Daytona URL...");
  const directUrl = `https://${DEV_PORT}-${sandbox.id}.proxy.daytona.works`;
  console.log(`   Direct URL: ${directUrl}`);

  try {
    const directResponse = await fetch(directUrl, {
      headers: {
        "User-Agent": "Daytona-Proxy-Test/1.0",
      },
    });
    console.log(`   Direct status: ${directResponse.status}`);

    const directBody = await directResponse.text();
    if (
      directBody.includes("Warning") ||
      (directBody.includes("daytona") && directBody.includes("security"))
    ) {
      console.log(`   ℹ️  Direct URL shows warning (expected without proxy)`);
    }
  } catch (error) {
    console.log(`   Direct URL test:`, error);
  }

  // Cleanup
  console.log("\n6️⃣  Cleaning up...");
  try {
    await sandbox.delete();
    console.log(`   ✅ Sandbox deleted`);
  } catch (error) {
    console.log(`   ⚠️  Failed to delete sandbox (may need manual cleanup)`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📋 Summary:");
  console.log(`   Proxy Base: ${PROXY_BASE}`);
  console.log(`   URL Format: https://{port}-{sandboxId}.${PROXY_BASE}`);
  console.log("\n   If tests passed, update your DNS:");
  console.log(`   CNAME *.preview → ${PROXY_BASE}`);
  console.log("=".repeat(50));
}

testProxy().catch(console.error);
