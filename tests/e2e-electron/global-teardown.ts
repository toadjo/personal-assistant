import { FullConfig } from "@playwright/test";

async function globalTeardown(_config: FullConfig) {
  console.log("[Electron E2E] Global teardown complete");
}

export default globalTeardown;
