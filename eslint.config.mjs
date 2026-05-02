import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    // Lint eslint.config.mjs; only skip ad-hoc Node scripts (no TS project context).
    ignores: [
      "dist/**",
      "release/**",
      "node_modules/**",
      ".vite/**",
      "scripts/**/*.mjs",
      "prettier.config.mjs",
      "src/main/preload-ipc-literals.generated.ts"
    ]
  }
);
