export function formatRetrySummary(attemptCount: number, retryCount: number): string {
  if (!Number.isFinite(retryCount) || retryCount <= 0) return "No retries";
  const safeAttempts = Number.isFinite(attemptCount) && attemptCount > 0 ? Math.floor(attemptCount) : retryCount + 1;
  return `${retryCount} retr${retryCount === 1 ? "y" : "ies"} (${safeAttempts} attempts)`;
}
