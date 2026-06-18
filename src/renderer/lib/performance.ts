/**
 * Lightweight performance instrumentation for Personal OS.
 *
 * This module provides simple timing utilities for measuring key performance metrics
 * during development. No user data is collected, only timing information.
 *
 * Usage:
 * ```ts
 * import { measurePerformance, logMetric } from './performance';
 *
 * const metric = measurePerformance('app-startup');
 * // ... do work ...
 * metric.end();
 *
 * // Or use the helper
 * logMetric('drawer-open', () => {
 *   // ... drawer open logic ...
 * });
 * ```
 */

// Enable instrumentation only in development
const ENABLED = import.meta.env.DEV;

type MetricName =
  | "app-startup"
  | "today-render"
  | "inbox-render"
  | "drawer-open"
  | "drawer-save"
  | "plan-today-render"
  | "plan-today-derive";

interface Metric {
  name: MetricName;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const metrics = new Map<string, Metric>();

/**
 * Start measuring a performance metric.
 */
export function measurePerformance(name: MetricName): Metric {
  if (!ENABLED) {
    return { name, startTime: 0 };
  }

  const metric: Metric = {
    name,
    startTime: performance.now()
  };

  const key = `${name}-${Date.now()}`;
  metrics.set(key, metric);

  return metric;
}

/**
 * End measuring a performance metric and log the result.
 */
export function endMetric(metric: Metric): void {
  if (!ENABLED) return;

  metric.endTime = performance.now();
  metric.duration = metric.endTime - metric.startTime;

  console.log(`[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`);
}

/**
 * Measure and log a function's execution time.
 */
export function logMetric<T>(name: MetricName, fn: () => T): T {
  if (!ENABLED) {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Measure and log an async function's execution time.
 */
export async function logMetricAsync<T>(name: MetricName, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) {
    return fn();
  }

  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Get all recorded metrics (for debugging).
 */
export function getMetrics(): Metric[] {
  if (!ENABLED) return [];
  return Array.from(metrics.values());
}

/**
 * Clear all recorded metrics.
 */
export function clearMetrics(): void {
  metrics.clear();
}
