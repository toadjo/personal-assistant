import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = join("assets", "generated", "team-hosted-backend.json");
const supabaseUrl = process.env.TEAM_PROJECTS_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.TEAM_PROJECTS_SUPABASE_ANON_KEY?.trim() ?? "";

function removeExistingConfig() {
  rmSync(outputPath, { force: true });
}

if (!supabaseUrl && !supabaseAnonKey) {
  removeExistingConfig();
  console.log("No hosted Team Projects backend configured for this build.");
  process.exit(0);
}

if (!supabaseUrl || !supabaseAnonKey) {
  removeExistingConfig();
  throw new Error("Set both TEAM_PROJECTS_SUPABASE_URL and TEAM_PROJECTS_SUPABASE_ANON_KEY, or neither.");
}

if (!supabaseUrl.startsWith("https://") || supabaseUrl.endsWith("/")) {
  removeExistingConfig();
  throw new Error("TEAM_PROJECTS_SUPABASE_URL must use https and must not end with a slash.");
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ supabaseUrl, supabaseAnonKey }, null, 2) + "\n", "utf8");
console.log("Bundled hosted Team Projects backend config for this build.");
