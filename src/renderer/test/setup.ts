import "@testing-library/jest-dom/vitest";

// Mock build-time constants that are injected by Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__APP_VERSION__ = "3.0.1";
