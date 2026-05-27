import "./load-env-file.mjs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = join("assets", "generated", "calendar-oauth-clients.json");
const googleClientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";
const googleClientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ?? "";
const microsoftClientId = process.env.MICROSOFT_CALENDAR_CLIENT_ID?.trim() ?? "";

function removeExistingConfig() {
  rmSync(outputPath, { force: true });
}

if (!googleClientId && !googleClientSecret && !microsoftClientId) {
  removeExistingConfig();
  console.log("No bundled calendar OAuth client IDs configured for this build.");
  process.exit(0);
}

const payload = {};
if (googleClientId) {
  payload.googleClientId = googleClientId;
}
if (googleClientSecret) {
  payload.googleClientSecret = googleClientSecret;
}
if (microsoftClientId) {
  payload.microsoftClientId = microsoftClientId;
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log("Bundled calendar OAuth client IDs for this build.");
