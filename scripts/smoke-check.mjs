import fs from "node:fs";

const required = [
  "src/main/main.ts",
  "src/main/db.ts",
  "src/main/services/homeAssistant.ts",
  "src/main/services/automation.ts",
  "src/renderer/App.tsx"
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

console.log("Smoke check passed: key MVP files exist.");
